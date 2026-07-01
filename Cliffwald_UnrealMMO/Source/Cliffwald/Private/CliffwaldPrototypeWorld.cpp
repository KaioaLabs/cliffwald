#include "CliffwaldPrototypeWorld.h"
#include "Cliffwald.h"
#include "CliffwaldEchoStudentActor.h"
#include "CliffwaldRoster.h"
#include "Components/LightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

namespace Cliffwald
{
    constexpr int32 PrototypeEchoSlots = Roster::MaxStudentBodiesPerShard;
}

ACliffwaldPrototypeWorld::ACliffwaldPrototypeWorld()
{
    PrimaryActorTick.bCanEverTick = false;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
    SetRootComponent(SceneRoot);

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeAsset(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (CubeAsset.Succeeded())
    {
        CubeMesh = CubeAsset.Object;
    }

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderAsset(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if (CylinderAsset.Succeeded())
    {
        CylinderMesh = CylinderAsset.Object;
    }

    static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereAsset(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (SphereAsset.Succeeded())
    {
        SphereMesh = SphereAsset.Object;
    }

    static ConstructorHelpers::FObjectFinder<UMaterialInterface> BasicMaterialAsset(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    if (BasicMaterialAsset.Succeeded())
    {
        BasicShapeMaterial = BasicMaterialAsset.Object;
    }
}

void ACliffwaldPrototypeWorld::BeginPlay()
{
    Super::BeginPlay();

    if (GetNetMode() != NM_Client)
    {
        SpawnEchoes();
    }
}

UStaticMeshComponent* ACliffwaldPrototypeWorld::AddBlock(FName Name, UStaticMesh* Mesh, const FVector& Location, const FVector& Scale, const FLinearColor& Color, const FRotator& Rotation)
{
    if (Mesh == nullptr)
    {
        return nullptr;
    }

    UStaticMeshComponent* Component = NewObject<UStaticMeshComponent>(this, Name);
    Component->SetupAttachment(SceneRoot);
    Component->SetStaticMesh(Mesh);
    Component->SetRelativeLocation(Location);
    Component->SetRelativeRotation(Rotation);
    Component->SetRelativeScale3D(Scale);
    Component->SetCollisionProfileName(TEXT("BlockAll"));

    if (BasicShapeMaterial != nullptr)
    {
        UMaterialInstanceDynamic* Material = UMaterialInstanceDynamic::Create(BasicShapeMaterial, Component);
        Material->SetVectorParameterValue(TEXT("Color"), Color);
        Component->SetMaterial(0, Material);
    }

    Component->RegisterComponent();
    AddInstanceComponent(Component);

    return Component;
}

void ACliffwaldPrototypeWorld::AddLabel(FName Name, const FString& Text, const FVector& Location)
{
    UTextRenderComponent* Label = NewObject<UTextRenderComponent>(this, Name);
    Label->SetupAttachment(SceneRoot);
    Label->SetRelativeLocation(Location);
    Label->SetRelativeRotation(FRotator(0.0f, 180.0f, 0.0f));
    Label->SetHorizontalAlignment(EHorizTextAligment::EHTA_Center);
    Label->SetVerticalAlignment(EVerticalTextAligment::EVRTA_TextCenter);
    Label->SetTextRenderColor(FColor(231, 235, 205));
    Label->SetWorldSize(42.0f);
    Label->SetText(FText::FromString(Text));
    Label->RegisterComponent();
    AddInstanceComponent(Label);
}

void ACliffwaldPrototypeWorld::BuildSchoolBlockout()
{
    const FLinearColor Meadow(0.18f, 0.42f, 0.24f);
    const FLinearColor Stone(0.72f, 0.68f, 0.57f);
    const FLinearColor WarmStone(0.82f, 0.72f, 0.58f);
    const FLinearColor Roof(0.28f, 0.12f, 0.10f);
    const FLinearColor Path(0.62f, 0.54f, 0.40f);

    AddBlock(TEXT("MeadowGround"), CubeMesh, FVector(0.0f, 0.0f, -8.0f), FVector(42.0f, 42.0f, 0.12f), Meadow);
    AddBlock(TEXT("MainHall"), CubeMesh, FVector(650.0f, 0.0f, 145.0f), FVector(5.4f, 2.8f, 2.9f), WarmStone);
    AddBlock(TEXT("LibraryWing"), CubeMesh, FVector(250.0f, -410.0f, 105.0f), FVector(3.5f, 2.0f, 2.1f), Stone);
    AddBlock(TEXT("DormWing"), CubeMesh, FVector(250.0f, 410.0f, 105.0f), FVector(3.5f, 2.0f, 2.1f), Stone);
    AddBlock(TEXT("DiningHall"), CubeMesh, FVector(950.0f, 0.0f, 80.0f), FVector(2.8f, 4.4f, 1.6f), FLinearColor(0.76f, 0.61f, 0.48f));

    AddBlock(TEXT("MainHallRoof"), CubeMesh, FVector(650.0f, 0.0f, 303.0f), FVector(5.8f, 3.0f, 0.28f), Roof);
    AddBlock(TEXT("LibraryRoof"), CubeMesh, FVector(250.0f, -410.0f, 221.0f), FVector(3.8f, 2.2f, 0.25f), Roof);
    AddBlock(TEXT("DormRoof"), CubeMesh, FVector(250.0f, 410.0f, 221.0f), FVector(3.8f, 2.2f, 0.25f), Roof);
    AddBlock(TEXT("DiningRoof"), CubeMesh, FVector(950.0f, 0.0f, 169.0f), FVector(3.0f, 4.7f, 0.22f), Roof);

    AddBlock(TEXT("NorthTower"), CylinderMesh, FVector(620.0f, -330.0f, 230.0f), FVector(1.15f, 1.15f, 4.6f), WarmStone);
    AddBlock(TEXT("SouthTower"), CylinderMesh, FVector(620.0f, 330.0f, 230.0f), FVector(1.15f, 1.15f, 4.6f), WarmStone);
    AddBlock(TEXT("GateTowerLeft"), CylinderMesh, FVector(-350.0f, -180.0f, 125.0f), FVector(0.75f, 0.75f, 2.5f), Stone);
    AddBlock(TEXT("GateTowerRight"), CylinderMesh, FVector(-350.0f, 180.0f, 125.0f), FVector(0.75f, 0.75f, 2.5f), Stone);

    AddBlock(TEXT("CourtyardPath"), CubeMesh, FVector(130.0f, 0.0f, -1.0f), FVector(10.0f, 0.55f, 0.06f), Path);
    AddBlock(TEXT("LibraryPath"), CubeMesh, FVector(210.0f, -215.0f, 0.0f), FVector(4.0f, 0.38f, 0.05f), Path);
    AddBlock(TEXT("DormPath"), CubeMesh, FVector(210.0f, 215.0f, 0.0f), FVector(4.0f, 0.38f, 0.05f), Path);

    AddLabel(TEXT("MainHallLabel"), TEXT("Main Hall"), FVector(650.0f, -170.0f, 330.0f));
    AddLabel(TEXT("LibraryLabel"), TEXT("Library"), FVector(250.0f, -560.0f, 245.0f));
    AddLabel(TEXT("DormLabel"), TEXT("Dorms"), FVector(250.0f, 560.0f, 245.0f));
}

void ACliffwaldPrototypeWorld::BuildCourtyardDressing()
{
    static const FVector TreeLocations[] =
    {
        FVector(-220.0f, -360.0f, 0.0f),
        FVector(-80.0f, -500.0f, 0.0f),
        FVector(90.0f, -590.0f, 0.0f),
        FVector(450.0f, -610.0f, 0.0f),
        FVector(790.0f, -520.0f, 0.0f),
        FVector(-220.0f, 360.0f, 0.0f),
        FVector(-80.0f, 500.0f, 0.0f),
        FVector(90.0f, 590.0f, 0.0f),
        FVector(450.0f, 610.0f, 0.0f),
        FVector(790.0f, 520.0f, 0.0f)
    };

    for (int32 Index = 0; Index < UE_ARRAY_COUNT(TreeLocations); ++Index)
    {
        const FVector& Location = TreeLocations[Index];
        AddBlock(FName(*FString::Printf(TEXT("TreeTrunk_%02d"), Index)), CylinderMesh, Location + FVector(0.0f, 0.0f, 58.0f), FVector(0.18f, 0.18f, 1.15f), FLinearColor(0.30f, 0.18f, 0.10f));
        AddBlock(FName(*FString::Printf(TEXT("TreeCanopy_%02d"), Index)), SphereMesh, Location + FVector(0.0f, 0.0f, 145.0f), FVector(0.86f, 0.86f, 0.72f), FLinearColor(0.12f, 0.35f, 0.18f));
    }

    AddBlock(TEXT("CourtyardWell"), CylinderMesh, FVector(40.0f, 0.0f, 24.0f), FVector(0.62f, 0.62f, 0.48f), FLinearColor(0.40f, 0.42f, 0.44f));
    AddBlock(TEXT("PracticeRune"), CylinderMesh, FVector(-160.0f, 0.0f, 5.0f), FVector(1.1f, 1.1f, 0.035f), FLinearColor(0.12f, 0.82f, 1.0f));
    AddLabel(TEXT("RuneLabel"), TEXT("Practice Rune"), FVector(-160.0f, -135.0f, 58.0f));
}

void ACliffwaldPrototypeWorld::SpawnLighting()
{
    UWorld* World = GetWorld();
    if (World == nullptr)
    {
        return;
    }

    ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(FVector(-450.0f, -700.0f, 900.0f), FRotator(-42.0f, -35.0f, 0.0f));
    if (Sun != nullptr)
    {
        Sun->GetLightComponent()->SetIntensity(8.0f);
    }

    ASkyLight* Sky = World->SpawnActor<ASkyLight>(FVector::ZeroVector, FRotator::ZeroRotator);
    if (Sky != nullptr)
    {
        Sky->GetLightComponent()->SetIntensity(2.5f);
    }
}

void ACliffwaldPrototypeWorld::SpawnEchoes()
{
    UWorld* World = GetWorld();
    if (World == nullptr)
    {
        return;
    }

    static const TCHAR* EchoNameRoots[] =
    {
        TEXT("Mara"),
        TEXT("Iven"),
        TEXT("Sol"),
        TEXT("Rook"),
        TEXT("Elian"),
        TEXT("Nara"),
        TEXT("Vesper"),
        TEXT("Lio"),
        TEXT("Aster"),
        TEXT("Bryn"),
        TEXT("Cora"),
        TEXT("Dain"),
        TEXT("Eira"),
        TEXT("Fenn"),
        TEXT("Galen"),
        TEXT("Hale"),
        TEXT("Isla"),
        TEXT("Jori"),
        TEXT("Kest"),
        TEXT("Luma"),
        TEXT("Mire"),
        TEXT("Noor"),
        TEXT("Orin"),
        TEXT("Pax"),
        TEXT("Quill"),
        TEXT("Rhea"),
        TEXT("Sable"),
        TEXT("Tavi"),
        TEXT("Una"),
        TEXT("Vale")
    };

    for (int32 Index = 0; Index < Cliffwald::PrototypeEchoSlots; ++Index)
    {
        const int32 RootIndex = Index % UE_ARRAY_COUNT(EchoNameRoots);
        const int32 NameCycle = Index / UE_ARRAY_COUNT(EchoNameRoots);
        const FString EchoName = NameCycle == 0
            ? FString(EchoNameRoots[RootIndex])
            : FString::Printf(TEXT("%s_%02d"), EchoNameRoots[RootIndex], NameCycle + 1);

        const int32 Column = Index % 12;
        const int32 Row = Index / 12;
        const float Phase = static_cast<float>(Index) * 0.47f;
        const FVector HomeLocation(250.0f + (static_cast<float>(Column) - 5.5f) * 54.0f, 410.0f + (static_cast<float>(Row) - 3.5f) * 52.0f, 4.0f);

        ACliffwaldEchoStudentActor* Echo = World->SpawnActor<ACliffwaldEchoStudentActor>(HomeLocation, FRotator::ZeroRotator);
        if (Echo != nullptr)
        {
            Echo->ConfigureEcho(FName(*EchoName), Index, HomeLocation, Phase, Index < Cliffwald::Roster::VisibleNameplatesInPrototype);
        }
    }

    UE_LOG(LogCliffwald, Log, TEXT("Spawned %d autonomous Echo students for the zero-human school day."), Cliffwald::PrototypeEchoSlots);
    UE_LOG(LogCliffwald, Log, TEXT("Roster presence check: Humans=0 ActiveEchoes=%d TotalVisible=%d Cap=%d."),
        Cliffwald::PrototypeEchoSlots,
        Cliffwald::PrototypeEchoSlots,
        Cliffwald::Roster::MaxStudentBodiesPerShard);
}
