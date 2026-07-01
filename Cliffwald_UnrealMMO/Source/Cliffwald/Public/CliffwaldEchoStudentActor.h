#pragma once

#include "CoreMinimal.h"
#include "CliffwaldStudentTypes.h"
#include "GameFramework/Actor.h"
#include "CliffwaldEchoStudentActor.generated.h"

class UStaticMeshComponent;
class UTextRenderComponent;
class UMaterialInterface;
class FLifetimeProperty;

UCLASS()
class CLIFFWALD_API ACliffwaldEchoStudentActor : public AActor
{
    GENERATED_BODY()

public:
    ACliffwaldEchoStudentActor();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    void ConfigureEcho(FName InEchoName, int32 InStudentIndex, const FVector& InHomeLocation, float InPhaseOffset, bool bShowNameplate);
    FName GetEchoName() const { return EchoName; }
    int32 GetStudentIndex() const { return StudentIndex; }
    const FVector& GetHomeLocation() const { return HomeLocation; }
    bool IsClaimedByHuman() const { return bClaimedByHuman; }
    FString GetInteractionText() const;
    void TriggerGreeting();
    void SetNameplateVisible(bool bVisible);
    void SetHumanClaimed(bool bInClaimed);

private:
    UFUNCTION()
    void OnRep_EchoPresentation();

    void UpdateScheduledMovement(float DeltaSeconds);
    void ApplySchoolPhase(ECliffwaldSchoolPhase InPhase);
    FVector GetPhaseAnchor(ECliffwaldSchoolPhase InPhase) const;
    FVector GetFormationOffset(ECliffwaldSchoolPhase InPhase) const;
    FName GetActivityTagForPhase(ECliffwaldSchoolPhase InPhase) const;
    void UpdateNameplatePresentation();
    void ApplyClaimedPresentation();

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<USceneComponent> SceneRoot;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UStaticMeshComponent> BodyMesh;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UStaticMeshComponent> HeadMesh;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UTextRenderComponent> Nameplate;

    UPROPERTY(ReplicatedUsing = OnRep_EchoPresentation, Transient)
    FName EchoName = TEXT("Echo");

    UPROPERTY(Replicated, Transient)
    int32 StudentIndex = 0;

    UPROPERTY(ReplicatedUsing = OnRep_EchoPresentation, Transient)
    ECliffwaldSchoolPhase CurrentPhase = ECliffwaldSchoolPhase::Sleep;

    UPROPERTY(ReplicatedUsing = OnRep_EchoPresentation, Transient)
    FName ActivityTag = TEXT("Sleep");

    UPROPERTY(Transient)
    TObjectPtr<UMaterialInterface> BasicShapeMaterial;

    UPROPERTY(Transient)
    FVector HomeLocation = FVector::ZeroVector;

    UPROPERTY(Transient)
    float PhaseOffset = 0.0f;

    UPROPERTY(Transient)
    float RunningTime = 0.0f;

    UPROPERTY(Transient)
    FVector TargetLocation = FVector::ZeroVector;

    UPROPERTY(Transient)
    float GreetingTimeRemaining = 0.0f;

    UPROPERTY(ReplicatedUsing = OnRep_EchoPresentation, Transient)
    bool bNameplateVisible = false;

    UPROPERTY(ReplicatedUsing = OnRep_EchoPresentation, Transient)
    bool bClaimedByHuman = false;
};
