#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerState.h"
#include "CliffwaldPlayerState.generated.h"

class FLifetimeProperty;

UCLASS()
class CLIFFWALD_API ACliffwaldPlayerState : public APlayerState
{
    GENERATED_BODY()

public:
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    void ConfigureRosterSlot(int32 InStudentIndex, FName InStudentName, const FGuid& InStudentSlotId);
    void ClearRosterSlot();

    bool HasRosterSlot() const { return StudentIndex >= 0; }
    int32 GetStudentIndex() const { return StudentIndex; }
    FName GetStudentName() const { return StudentName; }
    const FGuid& GetStudentSlotId() const { return StudentSlotId; }

private:
    UPROPERTY(Replicated, Transient)
    FGuid StudentSlotId;

    UPROPERTY(Replicated, Transient)
    int32 StudentIndex = -1;

    UPROPERTY(Replicated, Transient)
    FName StudentName = TEXT("Student");
};
