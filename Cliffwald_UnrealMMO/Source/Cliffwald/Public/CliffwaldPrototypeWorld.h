#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CliffwaldPrototypeWorld.generated.h"

class UStaticMesh;
class UStaticMeshComponent;
class UMaterialInterface;

UCLASS()
class CLIFFWALD_API ACliffwaldPrototypeWorld : public AActor
{
    GENERATED_BODY()

public:
    ACliffwaldPrototypeWorld();

    virtual void BeginPlay() override;

private:
    UStaticMeshComponent* AddBlock(FName Name, UStaticMesh* Mesh, const FVector& Location, const FVector& Scale, const FLinearColor& Color = FLinearColor::White, const FRotator& Rotation = FRotator::ZeroRotator);
    void AddLabel(FName Name, const FString& Text, const FVector& Location);
    void BuildSchoolBlockout();
    void BuildCourtyardDressing();
    void SpawnLighting();
    void SpawnEchoes();

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(Transient)
    TObjectPtr<UStaticMesh> CubeMesh;

    UPROPERTY(Transient)
    TObjectPtr<UStaticMesh> CylinderMesh;

    UPROPERTY(Transient)
    TObjectPtr<UStaticMesh> SphereMesh;

    UPROPERTY(Transient)
    TObjectPtr<UMaterialInterface> BasicShapeMaterial;
};
