#include "CliffwaldGameMode.h"
#include "Cliffwald.h"
#include "CliffwaldHud.h"
#include "CliffwaldPlayerState.h"
#include "CliffwaldPrototypeWorld.h"
#include "CliffwaldRoster.h"
#include "CliffwaldSchoolGameState.h"
#include "CliffwaldEchoStudentActor.h"
#include "CliffwaldStudentCharacter.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Net/Core/Connection/NetEnums.h"

ACliffwaldGameMode::ACliffwaldGameMode()
{
    DefaultPawnClass = ACliffwaldStudentCharacter::StaticClass();
    HUDClass = ACliffwaldHud::StaticClass();
    GameStateClass = ACliffwaldSchoolGameState::StaticClass();
    PlayerStateClass = ACliffwaldPlayerState::StaticClass();
    GameNetDriverReplicationSystem = EReplicationSystem::Iris;
}

void ACliffwaldGameMode::StartPlay()
{
    Super::StartPlay();

    TActorIterator<ACliffwaldPrototypeWorld> PrototypeWorldIt(GetWorld());
    const bool bHasPrototypeWorld = PrototypeWorldIt ? true : false;

    if (!bHasPrototypeWorld)
    {
        UE_LOG(LogCliffwald, Error, TEXT("L_CliffwaldPrototype is missing CliffwaldPrototypeWorld. Run Scripts/CreatePrototypeMap.py before packaging."));
    }
}

void ACliffwaldGameMode::HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer)
{
    Super::HandleStartingNewPlayer_Implementation(NewPlayer);
    AssignRosterSlotToPlayer(NewPlayer);
}

void ACliffwaldGameMode::Logout(AController* Exiting)
{
    ReleaseRosterSlotForController(Exiting);
    Super::Logout(Exiting);
}

void ACliffwaldGameMode::AssignRosterSlotToPlayer(APlayerController* NewPlayer)
{
    if (NewPlayer == nullptr)
    {
        return;
    }

    ACliffwaldStudentCharacter* Student = Cast<ACliffwaldStudentCharacter>(NewPlayer->GetPawn());
    if (Student == nullptr)
    {
        UE_LOG(LogCliffwald, Error, TEXT("Cannot assign roster slot: player has no Cliffwald student pawn."));
        return;
    }

    ACliffwaldEchoStudentActor* Echo = FindBestEchoForHumanClaim();
    if (Echo == nullptr)
    {
        UE_LOG(LogCliffwald, Error, TEXT("Cannot assign roster slot: all %d student bodies are already human controlled."), Cliffwald::Roster::MaxStudentBodiesPerShard);
        LogRosterPresence();
        return;
    }

    FVector ClaimedLocation = Echo->GetActorLocation();
    ClaimedLocation.Z = 92.0f;
    Student->SetActorLocationAndRotation(ClaimedLocation, Echo->GetActorRotation(), false, nullptr, ETeleportType::TeleportPhysics);

    const int32 StudentIndex = Echo->GetStudentIndex();
    const FName StudentName = Echo->GetEchoName();
    const FGuid StablePrototypeSlotId(0xC11FFAA0, 0x00005EED, 0x00000000, static_cast<uint32>(StudentIndex + 1));

    Echo->SetHumanClaimed(true);
    Student->ConfigureRosterSlot(StudentIndex, StudentName, StablePrototypeSlotId);
    if (ACliffwaldPlayerState* CliffwaldPlayerState = NewPlayer->GetPlayerState<ACliffwaldPlayerState>())
    {
        CliffwaldPlayerState->ConfigureRosterSlot(StudentIndex, StudentName, StablePrototypeSlotId);
    }

    UE_LOG(LogCliffwald, Log, TEXT("Join succeeded: human player claimed roster slot %d (%s); visible roster cap remains %d."),
        StudentIndex,
        *StudentName.ToString(),
        Cliffwald::Roster::MaxStudentBodiesPerShard);
    LogRosterPresence();
}

void ACliffwaldGameMode::ReleaseRosterSlotForController(AController* Exiting)
{
    if (Exiting == nullptr)
    {
        return;
    }

    const ACliffwaldStudentCharacter* Student = Cast<ACliffwaldStudentCharacter>(Exiting->GetPawn());
    ACliffwaldPlayerState* CliffwaldPlayerState = Exiting->GetPlayerState<ACliffwaldPlayerState>();

    int32 StudentIndex = INDEX_NONE;
    FName StudentName = TEXT("Student");
    FVector RestoreLocation = FVector::ZeroVector;
    FRotator RestoreRotation = FRotator::ZeroRotator;
    bool bHasPawnTransform = false;

    if (Student != nullptr && Student->HasRosterSlot())
    {
        StudentIndex = Student->GetStudentIndex();
        StudentName = Student->GetStudentName();
        RestoreLocation = FVector(Student->GetActorLocation().X, Student->GetActorLocation().Y, 4.0f);
        RestoreRotation = Student->GetActorRotation();
        bHasPawnTransform = true;
    }
    else if (CliffwaldPlayerState != nullptr && CliffwaldPlayerState->HasRosterSlot())
    {
        StudentIndex = CliffwaldPlayerState->GetStudentIndex();
        StudentName = CliffwaldPlayerState->GetStudentName();
    }
    else
    {
        return;
    }

    ACliffwaldEchoStudentActor* Echo = FindEchoByStudentIndex(StudentIndex);
    if (Echo == nullptr)
    {
        UE_LOG(LogCliffwald, Error, TEXT("Could not restore Echo control for missing roster slot %d."), StudentIndex);
        return;
    }

    if (bHasPawnTransform)
    {
        Echo->SetActorLocation(RestoreLocation);
        Echo->SetActorRotation(RestoreRotation);
    }
    Echo->SetHumanClaimed(false);

    if (CliffwaldPlayerState != nullptr)
    {
        CliffwaldPlayerState->ClearRosterSlot();
    }

    UE_LOG(LogCliffwald, Log, TEXT("Human player released roster slot %d (%s); Echo continuity restored."),
        Echo->GetStudentIndex(),
        *StudentName.ToString());
    LogRosterPresence();
}

ACliffwaldEchoStudentActor* ACliffwaldGameMode::FindBestEchoForHumanClaim() const
{
    ACliffwaldEchoStudentActor* BestEcho = nullptr;
    int32 BestIndex = MAX_int32;

    for (TActorIterator<ACliffwaldEchoStudentActor> It(GetWorld()); It; ++It)
    {
        ACliffwaldEchoStudentActor* Echo = *It;
        if (Echo != nullptr && !Echo->IsClaimedByHuman() && Echo->GetStudentIndex() < BestIndex)
        {
            BestEcho = Echo;
            BestIndex = Echo->GetStudentIndex();
        }
    }

    return BestEcho;
}

ACliffwaldEchoStudentActor* ACliffwaldGameMode::FindEchoByStudentIndex(int32 StudentIndex) const
{
    for (TActorIterator<ACliffwaldEchoStudentActor> It(GetWorld()); It; ++It)
    {
        ACliffwaldEchoStudentActor* Echo = *It;
        if (Echo != nullptr && Echo->GetStudentIndex() == StudentIndex)
        {
            return Echo;
        }
    }

    return nullptr;
}

void ACliffwaldGameMode::LogRosterPresence() const
{
    int32 ClaimedHumans = 0;
    int32 ActiveEchoes = 0;

    for (TActorIterator<ACliffwaldEchoStudentActor> It(GetWorld()); It; ++It)
    {
        const ACliffwaldEchoStudentActor* Echo = *It;
        if (Echo == nullptr)
        {
            continue;
        }

        if (Echo->IsClaimedByHuman())
        {
            ++ClaimedHumans;
        }
        else
        {
            ++ActiveEchoes;
        }
    }

    UE_LOG(LogCliffwald, Log, TEXT("Roster presence check: Humans=%d ActiveEchoes=%d TotalVisible=%d Cap=%d."),
        ClaimedHumans,
        ActiveEchoes,
        ClaimedHumans + ActiveEchoes,
        Cliffwald::Roster::MaxStudentBodiesPerShard);
}
