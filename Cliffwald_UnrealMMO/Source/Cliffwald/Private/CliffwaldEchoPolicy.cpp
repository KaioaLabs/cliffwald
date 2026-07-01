#include "CliffwaldEchoPolicy.h"

bool UCliffwaldEchoPolicy::IsPersistentMutation(ECliffwaldMutationType MutationType)
{
    switch (MutationType)
    {
    case ECliffwaldMutationType::Stats:
    case ECliffwaldMutationType::Inventory:
    case ECliffwaldMutationType::Economy:
    case ECliffwaldMutationType::AcademicProgress:
    case ECliffwaldMutationType::Prestige:
    case ECliffwaldMutationType::Sanction:
    case ECliffwaldMutationType::Equipment:
    case ECliffwaldMutationType::IrreversibleChoice:
        return true;

    case ECliffwaldMutationType::VisualPresentation:
    case ECliffwaldMutationType::RuntimeLocation:
    case ECliffwaldMutationType::RuntimeSchedule:
    case ECliffwaldMutationType::RuntimeSocialState:
    default:
        return false;
    }
}

bool UCliffwaldEchoPolicy::CanApplyMutation(const FCliffwaldMutationContext& Context)
{
    const bool bOfflineEchoOnRealPlayer =
        Context.bPlayerOwnedSlot && Context.ControlMode == ECliffwaldControlMode::EchoOffline;

    if (bOfflineEchoOnRealPlayer && IsPersistentMutation(Context.MutationType))
    {
        return false;
    }

    return true;
}

FString UCliffwaldEchoPolicy::DescribeDeniedMutation(const FCliffwaldMutationContext& Context)
{
    if (CanApplyMutation(Context))
    {
        return TEXT("Mutation allowed.");
    }

    return TEXT("Offline Echoes are living skins for real player bodies: they may perform visible runtime theatre, but they must not persist player stats, inventory, economy, academic progress, prestige, sanctions, equipment, or irreversible choices.");
}
