#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "CliffwaldStudentTypes.h"
#include "CliffwaldSchoolStateSubsystem.generated.h"

class UCliffwaldStudentSlot;

UCLASS()
class CLIFFWALD_API UCliffwaldSchoolStateSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UCliffwaldStudentSlot* RegisterRealPlayerSlot(const FGuid& PersistentPlayerId, FName CharacterName);
    UCliffwaldStudentSlot* FindStudentSlot(const FGuid& PersistentPlayerId) const;

    bool MarkPlayerConnected(const FGuid& PersistentPlayerId);
    bool MarkPlayerDisconnectedAsEcho(const FGuid& PersistentPlayerId);
    bool CanMutateSlot(const FGuid& PersistentPlayerId, ECliffwaldMutationType MutationType) const;

private:
    UPROPERTY(Transient)
    TMap<FGuid, TObjectPtr<UCliffwaldStudentSlot>> StudentSlots;
};
