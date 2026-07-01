#include "CliffwaldPlayerState.h"
#include "Net/UnrealNetwork.h"

void ACliffwaldPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(ACliffwaldPlayerState, StudentSlotId);
    DOREPLIFETIME(ACliffwaldPlayerState, StudentIndex);
    DOREPLIFETIME(ACliffwaldPlayerState, StudentName);
}

void ACliffwaldPlayerState::ConfigureRosterSlot(int32 InStudentIndex, FName InStudentName, const FGuid& InStudentSlotId)
{
    StudentIndex = InStudentIndex;
    StudentName = InStudentName;
    StudentSlotId = InStudentSlotId;
}

void ACliffwaldPlayerState::ClearRosterSlot()
{
    StudentIndex = -1;
    StudentName = TEXT("Student");
    StudentSlotId.Invalidate();
}
