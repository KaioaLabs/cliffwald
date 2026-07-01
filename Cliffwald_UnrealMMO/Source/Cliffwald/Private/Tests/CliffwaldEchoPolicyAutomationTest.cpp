#include "CliffwaldEchoPolicy.h"
#include "CliffwaldSchoolStateSubsystem.h"
#include "CliffwaldStudentSlot.h"
#include "Engine/GameInstance.h"
#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS

namespace Cliffwald::Tests
{
    constexpr ECliffwaldMutationType PersistentMutations[] =
    {
        ECliffwaldMutationType::Stats,
        ECliffwaldMutationType::Inventory,
        ECliffwaldMutationType::Economy,
        ECliffwaldMutationType::AcademicProgress,
        ECliffwaldMutationType::Prestige,
        ECliffwaldMutationType::Sanction,
        ECliffwaldMutationType::Equipment,
        ECliffwaldMutationType::IrreversibleChoice
    };

    constexpr ECliffwaldMutationType RuntimeMutations[] =
    {
        ECliffwaldMutationType::VisualPresentation,
        ECliffwaldMutationType::RuntimeLocation,
        ECliffwaldMutationType::RuntimeSchedule,
        ECliffwaldMutationType::RuntimeSocialState
    };
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FCliffwaldEchoPolicyAutomationTest,
    "Cliffwald.Echo.Policy",
    EAutomationTestFlags_ApplicationContextMask | EAutomationTestFlags::EngineFilter)

bool FCliffwaldEchoPolicyAutomationTest::RunTest(const FString& Parameters)
{
    FCliffwaldMutationContext OfflineRealPlayerContext;
    OfflineRealPlayerContext.ControlMode = ECliffwaldControlMode::EchoOffline;
    OfflineRealPlayerContext.bPlayerOwnedSlot = true;

    for (const ECliffwaldMutationType MutationType : Cliffwald::Tests::PersistentMutations)
    {
        OfflineRealPlayerContext.MutationType = MutationType;
        TestFalse(TEXT("Offline Echoes on real player slots must deny persistent mutation."), UCliffwaldEchoPolicy::CanApplyMutation(OfflineRealPlayerContext));
    }

    for (const ECliffwaldMutationType MutationType : Cliffwald::Tests::RuntimeMutations)
    {
        OfflineRealPlayerContext.MutationType = MutationType;
        TestTrue(TEXT("Offline Echoes on real player slots may apply runtime theatre."), UCliffwaldEchoPolicy::CanApplyMutation(OfflineRealPlayerContext));
    }

    FCliffwaldMutationContext HumanContext = OfflineRealPlayerContext;
    HumanContext.ControlMode = ECliffwaldControlMode::HumanOnline;
    HumanContext.MutationType = ECliffwaldMutationType::Inventory;
    TestTrue(TEXT("Human-controlled real player slots may apply server-authorized persistent mutation."), UCliffwaldEchoPolicy::CanApplyMutation(HumanContext));

    FCliffwaldMutationContext SimulatedResidentContext = OfflineRealPlayerContext;
    SimulatedResidentContext.bPlayerOwnedSlot = false;
    SimulatedResidentContext.MutationType = ECliffwaldMutationType::Inventory;
    TestTrue(TEXT("Non-player simulated residents are outside the protected real-player Echo invariant."), UCliffwaldEchoPolicy::CanApplyMutation(SimulatedResidentContext));

    UCliffwaldStudentSlot* Slot = NewObject<UCliffwaldStudentSlot>();
    TestNotNull(TEXT("Student slot test object is valid."), Slot);
    if (Slot != nullptr)
    {
        Slot->InitializeSlot(FGuid(0xC11FFAA0, 0x00005EED, 0x00000000, 1), TEXT("Aster"), true);
        Slot->SetControlMode(ECliffwaldControlMode::EchoOffline);
        TestFalse(TEXT("Student slot blocks inventory mutation while its real player is offline Echo controlled."), Slot->CanApplyMutation(ECliffwaldMutationType::Inventory));
        TestTrue(TEXT("Student slot allows runtime schedule mutation while Echo controlled."), Slot->CanApplyMutation(ECliffwaldMutationType::RuntimeSchedule));

        Slot->SetControlMode(ECliffwaldControlMode::HumanOnline);
        TestTrue(TEXT("Student slot restores persistent mutation eligibility when the human reclaims control."), Slot->CanApplyMutation(ECliffwaldMutationType::Inventory));
    }

    UGameInstance* GameInstance = NewObject<UGameInstance>();
    TestNotNull(TEXT("Game instance outer for subsystem test is valid."), GameInstance);
    UCliffwaldSchoolStateSubsystem* SchoolState = GameInstance != nullptr ? NewObject<UCliffwaldSchoolStateSubsystem>(GameInstance) : nullptr;
    TestNotNull(TEXT("School state subsystem test object is valid."), SchoolState);
    if (SchoolState != nullptr)
    {
        const FGuid PersistentPlayerId(0xC11FFAA0, 0x00005EED, 0x00000000, 42);
        UCliffwaldStudentSlot* RegisteredSlot = SchoolState->RegisterRealPlayerSlot(PersistentPlayerId, TEXT("Mira"));
        TestNotNull(TEXT("RegisterRealPlayerSlot creates a real player slot."), RegisteredSlot);
        TestTrue(TEXT("Freshly registered human slot can mutate server-authorized inventory."), SchoolState->CanMutateSlot(PersistentPlayerId, ECliffwaldMutationType::Inventory));

        TestTrue(TEXT("Disconnect marks the real player slot as Echo controlled."), SchoolState->MarkPlayerDisconnectedAsEcho(PersistentPlayerId));
        TestFalse(TEXT("Disconnected Echo slot blocks persistent inventory mutation."), SchoolState->CanMutateSlot(PersistentPlayerId, ECliffwaldMutationType::Inventory));
        TestTrue(TEXT("Disconnected Echo slot still permits runtime location mutation."), SchoolState->CanMutateSlot(PersistentPlayerId, ECliffwaldMutationType::RuntimeLocation));

        UCliffwaldStudentSlot* ReRegisteredSlot = SchoolState->RegisterRealPlayerSlot(PersistentPlayerId, TEXT("Mira"));
        TestEqual(TEXT("Re-registering a returning player keeps the same slot object."), ReRegisteredSlot, RegisteredSlot);
        TestTrue(TEXT("Re-registering a returning player restores human mutation eligibility."), SchoolState->CanMutateSlot(PersistentPlayerId, ECliffwaldMutationType::Inventory));
    }

    return true;
}

#endif
