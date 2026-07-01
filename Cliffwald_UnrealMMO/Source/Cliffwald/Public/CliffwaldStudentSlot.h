#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "CliffwaldStudentTypes.h"
#include "CliffwaldStudentSlot.generated.h"

UCLASS()
class CLIFFWALD_API UCliffwaldStudentSlot : public UObject
{
    GENERATED_BODY()

public:
    void InitializeSlot(const FGuid& InPersistentPlayerId, FName InCharacterName, bool bInPlayerOwnedSlot);
    void SetControlMode(ECliffwaldControlMode InControlMode);
    bool CanApplyMutation(ECliffwaldMutationType MutationType) const;
    void ApplyRuntimeEchoState(const FCliffwaldRuntimeEchoState& InRuntimeEchoState);

    const FCliffwaldStudentIdentity& GetIdentity() const { return Identity; }
    ECliffwaldControlMode GetControlMode() const { return ControlMode; }
    const FCliffwaldRuntimeEchoState& GetRuntimeEchoState() const { return RuntimeEchoState; }

private:
    UPROPERTY(Transient)
    FCliffwaldStudentIdentity Identity;

    UPROPERTY(Transient)
    ECliffwaldControlMode ControlMode = ECliffwaldControlMode::HumanOnline;

    UPROPERTY(Transient)
    FCliffwaldRuntimeEchoState RuntimeEchoState;
};
