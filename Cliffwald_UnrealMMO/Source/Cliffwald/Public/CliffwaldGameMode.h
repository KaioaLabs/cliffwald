#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "CliffwaldGameMode.generated.h"

class ACliffwaldEchoStudentActor;
class AController;
class APlayerController;

UCLASS()
class CLIFFWALD_API ACliffwaldGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    ACliffwaldGameMode();

    virtual void StartPlay() override;
    virtual void HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer) override;
    virtual void Logout(AController* Exiting) override;

private:
    void AssignRosterSlotToPlayer(APlayerController* NewPlayer);
    void ReleaseRosterSlotForController(AController* Exiting);
    ACliffwaldEchoStudentActor* FindBestEchoForHumanClaim() const;
    ACliffwaldEchoStudentActor* FindEchoByStudentIndex(int32 StudentIndex) const;
    void LogRosterPresence() const;
};
