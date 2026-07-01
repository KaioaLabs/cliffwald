#pragma once

#include "CoreMinimal.h"
#include "CliffwaldStudentTypes.generated.h"

UENUM()
enum class ECliffwaldControlMode : uint8
{
    HumanOnline,
    EchoOffline,
    SimulatedResident
};

UENUM()
enum class ECliffwaldSchoolPhase : uint8
{
    Sleep,
    Breakfast,
    ClassBlock,
    Lunch,
    FreeTime,
    Dinner,
    Curfew
};

UENUM()
enum class ECliffwaldMutationType : uint8
{
    VisualPresentation,
    RuntimeLocation,
    RuntimeSchedule,
    RuntimeSocialState,
    Stats,
    Inventory,
    Economy,
    AcademicProgress,
    Prestige,
    Sanction,
    Equipment,
    IrreversibleChoice
};

USTRUCT()
struct FCliffwaldStudentIdentity
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, Category = "Cliffwald")
    FGuid PersistentPlayerId;

    UPROPERTY(EditAnywhere, Category = "Cliffwald")
    FName CharacterName = NAME_None;

    UPROPERTY(EditAnywhere, Category = "Cliffwald")
    bool bPlayerOwnedSlot = false;
};

USTRUCT()
struct FCliffwaldRuntimeEchoState
{
    GENERATED_BODY()

    UPROPERTY(Transient)
    FTransform RuntimeTransform = FTransform::Identity;

    UPROPERTY(Transient)
    FName ActivityTag = NAME_None;

    UPROPERTY(Transient)
    FName AnimationTag = NAME_None;

    UPROPERTY(Transient)
    FText BarkText;
};

USTRUCT()
struct FCliffwaldMutationContext
{
    GENERATED_BODY()

    UPROPERTY(Transient)
    ECliffwaldControlMode ControlMode = ECliffwaldControlMode::HumanOnline;

    UPROPERTY(Transient)
    ECliffwaldMutationType MutationType = ECliffwaldMutationType::VisualPresentation;

    UPROPERTY(Transient)
    bool bPlayerOwnedSlot = true;
};
