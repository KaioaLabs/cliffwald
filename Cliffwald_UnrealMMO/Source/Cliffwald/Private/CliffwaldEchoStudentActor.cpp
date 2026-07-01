#include "CliffwaldEchoStudentActor.h"
#include "Cliffwald.h"
#include "CliffwaldSchoolGameState.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "Net/UnrealNetwork.h"
#include "UObject/ConstructorHelpers.h"

ACliffwaldEchoStudentActor::ACliffwaldEchoStudentActor()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.TickInterval = 0.2f;

    bReplicates = true;
    SetReplicateMovement(true);
    SetNetUpdateFrequency(5.0f);
    SetMinNetUpdateFrequency(1.0f);
    SetNetCullDistanceSquared(FMath::Square(3600.0f));

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
    SetRootComponent(SceneRoot);

    BodyMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BodyMesh"));
    BodyMesh->SetupAttachment(SceneRoot);
    BodyMesh->SetRelativeLocation(FVector(0.0f, 0.0f, 45.0f));
    BodyMesh->SetRelativeScale3D(FVector(0.32f, 0.32f, 0.78f));
    BodyMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    HeadMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeadMesh"));
    HeadMesh->SetupAttachment(SceneRoot);
    HeadMesh->SetRelativeLocation(FVector(0.0f, 0.0f, 104.0f));
    HeadMesh->SetRelativeScale3D(FVector(0.25f));
    HeadMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    Nameplate = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Nameplate"));
    Nameplate->SetupAttachment(SceneRoot);
    Nameplate->SetRelativeLocation(FVector(0.0f, 0.0f, 154.0f));
    Nameplate->SetHorizontalAlignment(EHorizTextAligment::EHTA_Center);
    Nameplate->SetVerticalAlignment(EVerticalTextAligment::EVRTA_TextCenter);
    Nameplate->SetTextRenderColor(FColor(245, 232, 178));
    Nameplate->SetWorldSize(26.0f);
    Nameplate->SetText(FText::FromString(TEXT("Echo")));
    Nameplate->SetVisibility(false);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if (CylinderMesh.Succeeded())
    {
        BodyMesh->SetStaticMesh(CylinderMesh.Object);
    }

    static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (SphereMesh.Succeeded())
    {
        HeadMesh->SetStaticMesh(SphereMesh.Object);
    }

    static ConstructorHelpers::FObjectFinder<UMaterialInterface> BasicMaterialAsset(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    if (BasicMaterialAsset.Succeeded())
    {
        BasicShapeMaterial = BasicMaterialAsset.Object;
    }
}

void ACliffwaldEchoStudentActor::BeginPlay()
{
    Super::BeginPlay();

    if (BasicShapeMaterial != nullptr)
    {
        UMaterialInstanceDynamic* BodyMaterial = UMaterialInstanceDynamic::Create(BasicShapeMaterial, this);
        BodyMaterial->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.38f, 0.30f, 0.62f));
        BodyMesh->SetMaterial(0, BodyMaterial);

        UMaterialInstanceDynamic* HeadMaterial = UMaterialInstanceDynamic::Create(BasicShapeMaterial, this);
        HeadMaterial->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.74f, 0.60f, 0.78f));
        HeadMesh->SetMaterial(0, HeadMaterial);
    }

    RunningTime = PhaseOffset;
    if (HasAuthority())
    {
        ApplySchoolPhase(ECliffwaldSchoolPhase::Sleep);
    }

    UE_LOG(LogCliffwald, Log, TEXT("Echo %s started autonomous school routine."), *EchoName.ToString());
}

void ACliffwaldEchoStudentActor::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (bClaimedByHuman)
    {
        return;
    }

    if (HasAuthority())
    {
        UpdateScheduledMovement(DeltaSeconds);
    }

    if (GreetingTimeRemaining > 0.0f)
    {
        GreetingTimeRemaining = FMath::Max(0.0f, GreetingTimeRemaining - DeltaSeconds);
        const float Bob = FMath::Sin(GreetingTimeRemaining * 14.0f) * 8.0f;
        Nameplate->SetRelativeLocation(FVector(0.0f, 0.0f, 162.0f + Bob));
        Nameplate->SetTextRenderColor(FColor(126, 226, 255));
        Nameplate->SetVisibility(true);
    }
    else
    {
        Nameplate->SetRelativeLocation(FVector(0.0f, 0.0f, 154.0f));
        Nameplate->SetTextRenderColor(FColor(245, 232, 178));
        Nameplate->SetVisibility(bNameplateVisible);
    }
}

void ACliffwaldEchoStudentActor::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(ACliffwaldEchoStudentActor, EchoName);
    DOREPLIFETIME(ACliffwaldEchoStudentActor, StudentIndex);
    DOREPLIFETIME(ACliffwaldEchoStudentActor, CurrentPhase);
    DOREPLIFETIME(ACliffwaldEchoStudentActor, ActivityTag);
    DOREPLIFETIME(ACliffwaldEchoStudentActor, bNameplateVisible);
    DOREPLIFETIME(ACliffwaldEchoStudentActor, bClaimedByHuman);
}

void ACliffwaldEchoStudentActor::ConfigureEcho(FName InEchoName, int32 InStudentIndex, const FVector& InHomeLocation, float InPhaseOffset, bool bShowNameplate)
{
    EchoName = InEchoName;
    StudentIndex = InStudentIndex;
    HomeLocation = InHomeLocation;
    PhaseOffset = InPhaseOffset;
    RunningTime = InPhaseOffset;
    bNameplateVisible = bShowNameplate;
    TargetLocation = InHomeLocation;

    UpdateNameplatePresentation();

    UE_LOG(LogCliffwald, Log, TEXT("Echo %s configured as transient AI skin for roster slot %d."), *EchoName.ToString(), StudentIndex);
}

FString ACliffwaldEchoStudentActor::GetInteractionText() const
{
    return FString::Printf(
        TEXT("%s esta en %s (%s). Es una IA de continuidad: presencia viva, sin cambiar stats ni inventario persistente."),
        *EchoName.ToString(),
        *ActivityTag.ToString(),
        ACliffwaldSchoolGameState::GetPhaseName(CurrentPhase));
}

void ACliffwaldEchoStudentActor::TriggerGreeting()
{
    GreetingTimeRemaining = 2.0f;
}

void ACliffwaldEchoStudentActor::SetNameplateVisible(bool bVisible)
{
    bNameplateVisible = bVisible;
    if (Nameplate != nullptr && GreetingTimeRemaining <= 0.0f)
    {
        Nameplate->SetVisibility(bNameplateVisible);
    }
}

void ACliffwaldEchoStudentActor::SetHumanClaimed(bool bInClaimed)
{
    if (bClaimedByHuman == bInClaimed)
    {
        return;
    }

    bClaimedByHuman = bInClaimed;
    SetActorTickEnabled(!bClaimedByHuman);
    SetReplicateMovement(!bClaimedByHuman);
    ApplyClaimedPresentation();

    UE_LOG(LogCliffwald, Log, TEXT("Roster slot %d (%s) %s human player."),
        StudentIndex,
        *EchoName.ToString(),
        bClaimedByHuman ? TEXT("yielded Echo control to") : TEXT("restored Echo control after"));
}

void ACliffwaldEchoStudentActor::OnRep_EchoPresentation()
{
    ApplyClaimedPresentation();
    UpdateNameplatePresentation();
}

void ACliffwaldEchoStudentActor::UpdateScheduledMovement(float DeltaSeconds)
{
    const ACliffwaldSchoolGameState* SchoolState = GetWorld() != nullptr ? GetWorld()->GetGameState<ACliffwaldSchoolGameState>() : nullptr;
    const ECliffwaldSchoolPhase DesiredPhase = SchoolState != nullptr ? SchoolState->GetCurrentPhase() : ECliffwaldSchoolPhase::Sleep;
    if (DesiredPhase != CurrentPhase || TargetLocation.IsNearlyZero())
    {
        ApplySchoolPhase(DesiredPhase);
    }

    RunningTime += DeltaSeconds;

    const float IdleRadius = 16.0f + static_cast<float>(StudentIndex % 5) * 3.0f;
    const FVector IdleOffset(
        FMath::Sin(RunningTime * 0.45f + PhaseOffset) * IdleRadius,
        FMath::Cos(RunningTime * 0.37f + PhaseOffset) * IdleRadius,
        0.0f);
    const FVector DesiredLocation = TargetLocation + IdleOffset;
    FVector ToTarget = DesiredLocation - GetActorLocation();
    ToTarget.Z = 0.0f;

    const float Distance = ToTarget.Size();
    if (Distance > 2.0f)
    {
        const float Speed = CurrentPhase == ECliffwaldSchoolPhase::Curfew ? 160.0f : 130.0f;
        const FVector Step = ToTarget.GetSafeNormal() * FMath::Min(Distance, Speed * DeltaSeconds);
        FVector NewLocation = GetActorLocation() + Step;
        NewLocation.Z = 4.0f;
        SetActorLocation(NewLocation);
        SetActorRotation(ToTarget.Rotation());
    }
}

void ACliffwaldEchoStudentActor::ApplySchoolPhase(ECliffwaldSchoolPhase InPhase)
{
    CurrentPhase = InPhase;
    ActivityTag = GetActivityTagForPhase(InPhase);
    TargetLocation = GetPhaseAnchor(InPhase) + GetFormationOffset(InPhase);

    UE_LOG(LogCliffwald, Verbose, TEXT("Echo %s routine -> %s at %s."),
        *EchoName.ToString(),
        ACliffwaldSchoolGameState::GetPhaseName(CurrentPhase),
        *TargetLocation.ToCompactString());
}

FVector ACliffwaldEchoStudentActor::GetPhaseAnchor(ECliffwaldSchoolPhase InPhase) const
{
    switch (InPhase)
    {
    case ECliffwaldSchoolPhase::Breakfast:
    case ECliffwaldSchoolPhase::Lunch:
    case ECliffwaldSchoolPhase::Dinner:
        return FVector(950.0f, 0.0f, 4.0f);
    case ECliffwaldSchoolPhase::ClassBlock:
        return FVector(250.0f, -410.0f, 4.0f);
    case ECliffwaldSchoolPhase::FreeTime:
        return FVector(-160.0f, 0.0f, 4.0f);
    case ECliffwaldSchoolPhase::Curfew:
    case ECliffwaldSchoolPhase::Sleep:
    default:
        return HomeLocation;
    }
}

FVector ACliffwaldEchoStudentActor::GetFormationOffset(ECliffwaldSchoolPhase InPhase) const
{
    const int32 Columns = 12;
    const int32 Column = StudentIndex % Columns;
    const int32 Row = StudentIndex / Columns;
    const float CenteredColumn = static_cast<float>(Column) - 5.5f;
    const float CenteredRow = static_cast<float>(Row) - 3.5f;

    const float TightX = CenteredColumn * 54.0f;
    const float TightY = CenteredRow * 52.0f;
    const float WideX = CenteredColumn * 74.0f;
    const float WideY = CenteredRow * 68.0f;

    switch (InPhase)
    {
    case ECliffwaldSchoolPhase::Breakfast:
    case ECliffwaldSchoolPhase::Lunch:
    case ECliffwaldSchoolPhase::Dinner:
        return FVector(TightX, TightY, 0.0f);
    case ECliffwaldSchoolPhase::ClassBlock:
        return FVector(TightX * 0.9f, TightY, 0.0f);
    case ECliffwaldSchoolPhase::FreeTime:
        return FVector(WideX, WideY, 0.0f);
    case ECliffwaldSchoolPhase::Curfew:
    case ECliffwaldSchoolPhase::Sleep:
    default:
        return FVector(WideX * 0.45f, WideY * 0.45f, 0.0f);
    }
}

FName ACliffwaldEchoStudentActor::GetActivityTagForPhase(ECliffwaldSchoolPhase InPhase) const
{
    switch (InPhase)
    {
    case ECliffwaldSchoolPhase::Sleep:
        return TEXT("Dorm routine");
    case ECliffwaldSchoolPhase::Breakfast:
        return TEXT("Breakfast");
    case ECliffwaldSchoolPhase::ClassBlock:
        return TEXT("Class");
    case ECliffwaldSchoolPhase::Lunch:
        return TEXT("Lunch");
    case ECliffwaldSchoolPhase::FreeTime:
        return TEXT("Free time");
    case ECliffwaldSchoolPhase::Dinner:
        return TEXT("Dinner");
    case ECliffwaldSchoolPhase::Curfew:
        return TEXT("Curfew");
    default:
        return TEXT("Routine");
    }
}

void ACliffwaldEchoStudentActor::UpdateNameplatePresentation()
{
    if (Nameplate == nullptr)
    {
        return;
    }

    Nameplate->SetText(FText::FromName(EchoName));
    if (GreetingTimeRemaining <= 0.0f)
    {
        Nameplate->SetVisibility(bNameplateVisible && !bClaimedByHuman);
    }
}

void ACliffwaldEchoStudentActor::ApplyClaimedPresentation()
{
    const bool bVisibleAsEcho = !bClaimedByHuman;
    if (BodyMesh != nullptr)
    {
        BodyMesh->SetVisibility(bVisibleAsEcho, true);
    }
    if (HeadMesh != nullptr)
    {
        HeadMesh->SetVisibility(bVisibleAsEcho, true);
    }
    if (Nameplate != nullptr)
    {
        Nameplate->SetVisibility(bVisibleAsEcho && bNameplateVisible && GreetingTimeRemaining <= 0.0f);
    }
}
