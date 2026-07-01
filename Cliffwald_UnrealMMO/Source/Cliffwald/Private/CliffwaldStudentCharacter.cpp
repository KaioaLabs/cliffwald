#include "CliffwaldStudentCharacter.h"
#include "Cliffwald.h"
#include "CliffwaldEchoStudentActor.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/Controller.h"
#include "GameFramework/SpringArmComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "Net/UnrealNetwork.h"
#include "UObject/ConstructorHelpers.h"

ACliffwaldStudentCharacter::ACliffwaldStudentCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    bReplicates = true;
    SetReplicateMovement(true);
    SetNetUpdateFrequency(20.0f);
    SetMinNetUpdateFrequency(5.0f);
    SetNetCullDistanceSquared(FMath::Square(4200.0f));

    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = false;
    bUseControllerRotationRoll = false;

    GetCapsuleComponent()->InitCapsuleSize(34.0f, 88.0f);

    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0.0f, 540.0f, 0.0f);
    GetCharacterMovement()->MaxWalkSpeed = 420.0f;
    GetCharacterMovement()->JumpZVelocity = 520.0f;
    GetCharacterMovement()->AirControl = 0.25f;

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 520.0f;
    CameraBoom->SetRelativeLocation(FVector(0.0f, 0.0f, 65.0f));
    CameraBoom->bUsePawnControlRotation = true;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;

    BodyMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BodyMesh"));
    BodyMesh->SetupAttachment(RootComponent);
    BodyMesh->SetRelativeLocation(FVector(0.0f, 0.0f, -18.0f));
    BodyMesh->SetRelativeScale3D(FVector(0.42f, 0.42f, 0.92f));
    BodyMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    HeadMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeadMesh"));
    HeadMesh->SetupAttachment(RootComponent);
    HeadMesh->SetRelativeLocation(FVector(0.0f, 0.0f, 62.0f));
    HeadMesh->SetRelativeScale3D(FVector(0.34f));
    HeadMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    SpellPulseMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("SpellPulseMesh"));
    SpellPulseMesh->SetupAttachment(RootComponent);
    SpellPulseMesh->SetRelativeLocation(FVector(90.0f, 0.0f, 48.0f));
    SpellPulseMesh->SetRelativeScale3D(FVector(0.12f));
    SpellPulseMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    SpellPulseMesh->SetVisibility(false);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if (CylinderMesh.Succeeded())
    {
        BodyMesh->SetStaticMesh(CylinderMesh.Object);
    }

    static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (SphereMesh.Succeeded())
    {
        HeadMesh->SetStaticMesh(SphereMesh.Object);
        SpellPulseMesh->SetStaticMesh(SphereMesh.Object);
    }

    static ConstructorHelpers::FObjectFinder<UMaterialInterface> BasicMaterialAsset(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    if (BasicMaterialAsset.Succeeded())
    {
        BasicShapeMaterial = BasicMaterialAsset.Object;
    }
}

void ACliffwaldStudentCharacter::BeginPlay()
{
    Super::BeginPlay();

    if (BasicShapeMaterial != nullptr)
    {
        UMaterialInstanceDynamic* BodyMaterial = UMaterialInstanceDynamic::Create(BasicShapeMaterial, this);
        BodyMaterial->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.16f, 0.48f, 0.62f));
        BodyMesh->SetMaterial(0, BodyMaterial);

        UMaterialInstanceDynamic* HeadMaterial = UMaterialInstanceDynamic::Create(BasicShapeMaterial, this);
        HeadMaterial->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.82f, 0.68f, 0.52f));
        HeadMesh->SetMaterial(0, HeadMaterial);

        UMaterialInstanceDynamic* PulseMaterial = UMaterialInstanceDynamic::Create(BasicShapeMaterial, this);
        PulseMaterial->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.18f, 0.86f, 1.0f));
        SpellPulseMesh->SetMaterial(0, PulseMaterial);
    }

    StatusText = TEXT("Esperando asignacion de slot de roster.");
    StatusTimeRemaining = 6.0f;
    UE_LOG(LogCliffwald, Verbose, TEXT("Student character spawned for slot %s."), *StudentSlotId.ToString());
}

void ACliffwaldStudentCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (StatusTimeRemaining > 0.0f)
    {
        StatusTimeRemaining = FMath::Max(0.0f, StatusTimeRemaining - DeltaSeconds);
        if (StatusTimeRemaining <= 0.0f)
        {
            StatusText.Reset();
        }
    }

    UpdateSpellPulse(DeltaSeconds);
}

void ACliffwaldStudentCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &ACliffwaldStudentCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &ACliffwaldStudentCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("Turn"), this, &ACliffwaldStudentCharacter::Turn);
    PlayerInputComponent->BindAxis(TEXT("LookUp"), this, &ACliffwaldStudentCharacter::LookUp);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &ACliffwaldStudentCharacter::StartJump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACliffwaldStudentCharacter::StopJump);
    PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed, this, &ACliffwaldStudentCharacter::Interact);
    PlayerInputComponent->BindAction(TEXT("CastSpell"), IE_Pressed, this, &ACliffwaldStudentCharacter::CastPracticeSpell);
}

void ACliffwaldStudentCharacter::SetStudentSlotId(const FGuid& InStudentSlotId)
{
    StudentSlotId = InStudentSlotId;
}

void ACliffwaldStudentCharacter::ConfigureRosterSlot(int32 InStudentIndex, FName InStudentName, const FGuid& InStudentSlotId)
{
    StudentIndex = InStudentIndex;
    StudentName = InStudentName;
    StudentSlotId = InStudentSlotId;
    UpdateRosterStatusText();
}

void ACliffwaldStudentCharacter::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(ACliffwaldStudentCharacter, StudentSlotId);
    DOREPLIFETIME(ACliffwaldStudentCharacter, StudentIndex);
    DOREPLIFETIME(ACliffwaldStudentCharacter, StudentName);
}

void ACliffwaldStudentCharacter::OnRep_RosterSlot()
{
    UpdateRosterStatusText();
}

void ACliffwaldStudentCharacter::MoveForward(float Value)
{
    if (Controller != nullptr && !FMath::IsNearlyZero(Value))
    {
        const FRotator YawRotation(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
        AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X), Value);
    }
}

void ACliffwaldStudentCharacter::MoveRight(float Value)
{
    if (Controller != nullptr && !FMath::IsNearlyZero(Value))
    {
        const FRotator YawRotation(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
        AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y), Value);
    }
}

void ACliffwaldStudentCharacter::Turn(float Value)
{
    AddControllerYawInput(Value);
}

void ACliffwaldStudentCharacter::LookUp(float Value)
{
    AddControllerPitchInput(Value);
}

void ACliffwaldStudentCharacter::StartJump()
{
    Jump();
}

void ACliffwaldStudentCharacter::StopJump()
{
    StopJumping();
}

void ACliffwaldStudentCharacter::Interact()
{
    ACliffwaldEchoStudentActor* Echo = FindNearestEcho(260.0f);
    if (Echo == nullptr)
    {
        StatusText = TEXT("No hay ningun Echo lo bastante cerca.");
        StatusTimeRemaining = 2.0f;
        return;
    }

    Echo->TriggerGreeting();
    StatusText = Echo->GetInteractionText();
    StatusTimeRemaining = 4.0f;
    UE_LOG(LogCliffwald, Log, TEXT("Player interacted with Echo %s; persistent player data unchanged."), *Echo->GetEchoName().ToString());
}

void ACliffwaldStudentCharacter::CastPracticeSpell()
{
    bSpellPulseActive = true;
    SpellPulseAge = 0.0f;
    SpellPulseMesh->SetVisibility(true);
    StatusText = TEXT("Pulso de practica: feedback local, sin modificar stats ni items.");
    StatusTimeRemaining = 2.5f;
}

ACliffwaldEchoStudentActor* ACliffwaldStudentCharacter::FindNearestEcho(float MaxDistance) const
{
    UWorld* World = GetWorld();
    if (World == nullptr)
    {
        return nullptr;
    }

    ACliffwaldEchoStudentActor* NearestEcho = nullptr;
    float BestDistanceSquared = FMath::Square(MaxDistance);
    const FVector Origin = GetActorLocation();

    for (TActorIterator<ACliffwaldEchoStudentActor> It(World); It; ++It)
    {
        ACliffwaldEchoStudentActor* Echo = *It;
        if (Echo->IsClaimedByHuman())
        {
            continue;
        }

        const float DistanceSquared = FVector::DistSquared(Origin, Echo->GetActorLocation());
        if (DistanceSquared < BestDistanceSquared)
        {
            BestDistanceSquared = DistanceSquared;
            NearestEcho = Echo;
        }
    }

    return NearestEcho;
}

void ACliffwaldStudentCharacter::UpdateSpellPulse(float DeltaSeconds)
{
    if (!bSpellPulseActive || SpellPulseMesh == nullptr)
    {
        return;
    }

    SpellPulseAge += DeltaSeconds;
    const float Lifetime = 0.55f;
    const float Alpha = FMath::Clamp(SpellPulseAge / Lifetime, 0.0f, 1.0f);
    const float Distance = FMath::Lerp(90.0f, 260.0f, Alpha);
    const float Scale = FMath::Lerp(0.12f, 0.36f, Alpha);

    SpellPulseMesh->SetRelativeLocation(FVector(Distance, 0.0f, 48.0f));
    SpellPulseMesh->SetRelativeScale3D(FVector(Scale));

    if (SpellPulseAge >= Lifetime)
    {
        bSpellPulseActive = false;
        SpellPulseMesh->SetVisibility(false);
        SpellPulseMesh->SetRelativeLocation(FVector(90.0f, 0.0f, 48.0f));
        SpellPulseMesh->SetRelativeScale3D(FVector(0.12f));
    }
}

void ACliffwaldStudentCharacter::UpdateRosterStatusText()
{
    if (StudentIndex < 0)
    {
        return;
    }

    StatusText = FString::Printf(
        TEXT("Control humano: slot %02d %s. El Echo de este cuerpo ha cedido; stats/items siguen protegidos por servidor."),
        StudentIndex,
        *StudentName.ToString());
    StatusTimeRemaining = 8.0f;
}
