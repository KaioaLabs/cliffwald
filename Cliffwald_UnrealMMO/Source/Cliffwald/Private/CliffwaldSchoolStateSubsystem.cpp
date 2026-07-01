#include "CliffwaldSchoolStateSubsystem.h"
#include "Cliffwald.h"
#include "CliffwaldStudentSlot.h"

void UCliffwaldSchoolStateSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    UE_LOG(LogCliffwald, Log, TEXT("Cliffwald school state subsystem initialized."));
}

void UCliffwaldSchoolStateSubsystem::Deinitialize()
{
    StudentSlots.Reset();
    Super::Deinitialize();
}

UCliffwaldStudentSlot* UCliffwaldSchoolStateSubsystem::RegisterRealPlayerSlot(const FGuid& PersistentPlayerId, FName CharacterName)
{
    if (TObjectPtr<UCliffwaldStudentSlot>* ExistingSlot = StudentSlots.Find(PersistentPlayerId))
    {
        (*ExistingSlot)->InitializeSlot(PersistentPlayerId, CharacterName, true);
        (*ExistingSlot)->SetControlMode(ECliffwaldControlMode::HumanOnline);
        return ExistingSlot->Get();
    }

    UCliffwaldStudentSlot* NewSlot = NewObject<UCliffwaldStudentSlot>(this);
    NewSlot->InitializeSlot(PersistentPlayerId, CharacterName, true);
    NewSlot->SetControlMode(ECliffwaldControlMode::HumanOnline);
    StudentSlots.Add(PersistentPlayerId, NewSlot);

    return NewSlot;
}

UCliffwaldStudentSlot* UCliffwaldSchoolStateSubsystem::FindStudentSlot(const FGuid& PersistentPlayerId) const
{
    const TObjectPtr<UCliffwaldStudentSlot>* FoundSlot = StudentSlots.Find(PersistentPlayerId);
    return FoundSlot != nullptr ? FoundSlot->Get() : nullptr;
}

bool UCliffwaldSchoolStateSubsystem::MarkPlayerConnected(const FGuid& PersistentPlayerId)
{
    UCliffwaldStudentSlot* Slot = FindStudentSlot(PersistentPlayerId);
    if (Slot == nullptr)
    {
        return false;
    }

    Slot->SetControlMode(ECliffwaldControlMode::HumanOnline);
    return true;
}

bool UCliffwaldSchoolStateSubsystem::MarkPlayerDisconnectedAsEcho(const FGuid& PersistentPlayerId)
{
    UCliffwaldStudentSlot* Slot = FindStudentSlot(PersistentPlayerId);
    if (Slot == nullptr)
    {
        return false;
    }

    Slot->SetControlMode(ECliffwaldControlMode::EchoOffline);
    return true;
}

bool UCliffwaldSchoolStateSubsystem::CanMutateSlot(const FGuid& PersistentPlayerId, ECliffwaldMutationType MutationType) const
{
    const UCliffwaldStudentSlot* Slot = FindStudentSlot(PersistentPlayerId);
    return Slot != nullptr && Slot->CanApplyMutation(MutationType);
}
