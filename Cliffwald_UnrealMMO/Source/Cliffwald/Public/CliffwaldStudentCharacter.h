#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CliffwaldStudentCharacter.generated.h"

class UCameraComponent;
class UMaterialInterface;
class USpringArmComponent;
class UStaticMeshComponent;
class ACliffwaldEchoStudentActor;
class FLifetimeProperty;

UCLASS()
class CLIFFWALD_API ACliffwaldStudentCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ACliffwaldStudentCharacter();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    void SetStudentSlotId(const FGuid& InStudentSlotId);
    void ConfigureRosterSlot(int32 InStudentIndex, FName InStudentName, const FGuid& InStudentSlotId);
    const FGuid& GetStudentSlotId() const { return StudentSlotId; }
    int32 GetStudentIndex() const { return StudentIndex; }
    FName GetStudentName() const { return StudentName; }
    bool HasRosterSlot() const { return StudentIndex >= 0; }
    const FString& GetStatusText() const { return StatusText; }

private:
    UFUNCTION()
    void OnRep_RosterSlot();

    void MoveForward(float Value);
    void MoveRight(float Value);
    void Turn(float Value);
    void LookUp(float Value);
    void StartJump();
    void StopJump();
    void Interact();
    void CastPracticeSpell();
    ACliffwaldEchoStudentActor* FindNearestEcho(float MaxDistance) const;
    void UpdateSpellPulse(float DeltaSeconds);
    void UpdateRosterStatusText();

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UCameraComponent> FollowCamera;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UStaticMeshComponent> BodyMesh;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UStaticMeshComponent> HeadMesh;

    UPROPERTY(VisibleAnywhere, Category = "Cliffwald")
    TObjectPtr<UStaticMeshComponent> SpellPulseMesh;

    UPROPERTY(ReplicatedUsing = OnRep_RosterSlot, Transient)
    FGuid StudentSlotId;

    UPROPERTY(ReplicatedUsing = OnRep_RosterSlot, Transient)
    int32 StudentIndex = -1;

    UPROPERTY(ReplicatedUsing = OnRep_RosterSlot, Transient)
    FName StudentName = TEXT("Student");

    UPROPERTY(Transient)
    TObjectPtr<UMaterialInterface> BasicShapeMaterial;

    UPROPERTY(Transient)
    FString StatusText;

    UPROPERTY(Transient)
    float StatusTimeRemaining = 0.0f;

    UPROPERTY(Transient)
    float SpellPulseAge = 0.0f;

    UPROPERTY(Transient)
    bool bSpellPulseActive = false;
};
