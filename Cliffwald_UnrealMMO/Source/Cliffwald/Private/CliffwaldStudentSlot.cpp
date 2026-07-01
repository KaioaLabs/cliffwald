#include "CliffwaldStudentSlot.h"
#include "CliffwaldEchoPolicy.h"

void UCliffwaldStudentSlot::InitializeSlot(const FGuid& InPersistentPlayerId, FName InCharacterName, bool bInPlayerOwnedSlot)
{
    Identity.PersistentPlayerId = InPersistentPlayerId;
    Identity.CharacterName = InCharacterName;
    Identity.bPlayerOwnedSlot = bInPlayerOwnedSlot;
}

void UCliffwaldStudentSlot::SetControlMode(ECliffwaldControlMode InControlMode)
{
    ControlMode = InControlMode;
}

bool UCliffwaldStudentSlot::CanApplyMutation(ECliffwaldMutationType MutationType) const
{
    FCliffwaldMutationContext Context;
    Context.ControlMode = ControlMode;
    Context.MutationType = MutationType;
    Context.bPlayerOwnedSlot = Identity.bPlayerOwnedSlot;

    return UCliffwaldEchoPolicy::CanApplyMutation(Context);
}

void UCliffwaldStudentSlot::ApplyRuntimeEchoState(const FCliffwaldRuntimeEchoState& InRuntimeEchoState)
{
    RuntimeEchoState = InRuntimeEchoState;
}
