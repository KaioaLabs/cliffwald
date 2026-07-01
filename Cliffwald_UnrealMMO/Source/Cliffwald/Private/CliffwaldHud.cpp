#include "CliffwaldHud.h"
#include "CliffwaldRoster.h"
#include "CliffwaldSchoolGameState.h"
#include "CliffwaldStudentCharacter.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "GameFramework/PlayerController.h"
#include "HAL/IConsoleManager.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "ProfilingDebugging/CsvProfiler.h"
#include "TimerManager.h"

void ACliffwaldHud::BeginPlay()
{
    Super::BeginPlay();

    int32 CaptureFrames = 0;
    if (!FParse::Value(FCommandLine::Get(), TEXT("CliffwaldCsvCaptureFrames="), CaptureFrames) || CaptureFrames <= 0)
    {
        return;
    }

    float CaptureDelaySeconds = 30.0f;
    FParse::Value(FCommandLine::Get(), TEXT("CliffwaldCsvCaptureDelaySeconds="), CaptureDelaySeconds);
    CaptureDelaySeconds = FMath::Max(0.0f, CaptureDelaySeconds);

    UE_LOG(LogTemp, Display, TEXT("Cliffwald CSV profiler scheduled: Frames=%d DelaySeconds=%.2f"), CaptureFrames, CaptureDelaySeconds);

    FTimerDelegate StartCsvCapture = FTimerDelegate::CreateWeakLambda(this, [CaptureFrames]()
    {
#if CSV_PROFILER
        if (IConsoleVariable* CsvBenchmark = IConsoleManager::Get().FindConsoleVariable(TEXT("csv.Benchmark")))
        {
            CsvBenchmark->Set(0, ECVF_SetByCode);
        }

        if (FCsvProfiler::Get()->IsCapturing())
        {
            UE_LOG(LogTemp, Warning, TEXT("Cliffwald CSV profiler capture skipped because another CSV capture is already running."));
            return;
        }

        FCsvProfiler::Get()->BeginCapture(CaptureFrames, FString(), TEXT("CliffwaldGameplay"));
        UE_LOG(LogTemp, Display, TEXT("Cliffwald CSV profiler capture started: Frames=%d"), CaptureFrames);
#else
        UE_LOG(LogTemp, Warning, TEXT("Cliffwald CSV profiler requested but CSV_PROFILER is disabled for this build."));
#endif
    });

    GetWorldTimerManager().SetTimerForNextTick(FTimerDelegate::CreateWeakLambda(this, [this, CaptureDelaySeconds, StartCsvCapture]()
    {
        FTimerHandle CaptureTimerHandle;
        GetWorldTimerManager().SetTimer(CaptureTimerHandle, StartCsvCapture, CaptureDelaySeconds, false);
    }));
}

void ACliffwaldHud::DrawHUD()
{
    Super::DrawHUD();

    if (Canvas == nullptr || GEngine == nullptr)
    {
        return;
    }

    UFont* Font = GEngine->GetSmallFont();
    const float X = 24.0f;
    float Y = 24.0f;
    const float LineHeight = 18.0f;

    DrawText(TEXT("Cliffwald UE 5.8 - vertical slice C++"), FColor(238, 244, 224), X, Y, Font);
    Y += LineHeight;
    DrawText(TEXT("WASD move | Mouse look | Space jump | E interact | Left click pulse"), FColor(210, 226, 198), X, Y, Font);
    Y += LineHeight;
    DrawText(TEXT("Echoes are living skins: visible AI only, no persistent stat/item mutation."), FColor(245, 216, 142), X, Y, Font);
    Y += LineHeight * 1.5f;
    DrawText(FString::Printf(TEXT("Shard target: %d student bodies. Humans reclaim slots; Echoes fill the rest."), Cliffwald::Roster::MaxStudentBodiesPerShard), FColor(214, 240, 194), X, Y, Font);
    Y += LineHeight * 1.5f;

    const ACliffwaldSchoolGameState* SchoolState = GetWorld() != nullptr ? GetWorld()->GetGameState<ACliffwaldSchoolGameState>() : nullptr;
    if (SchoolState != nullptr)
    {
        DrawText(FString::Printf(TEXT("%s | %s"), *SchoolState->GetClockLabel(), *SchoolState->GetPhaseLabel()), FColor(184, 231, 255), X, Y, Font);
        Y += LineHeight * 1.5f;
    }

    const APlayerController* PlayerController = GetOwningPlayerController();
    const ACliffwaldStudentCharacter* Student = PlayerController != nullptr ? Cast<ACliffwaldStudentCharacter>(PlayerController->GetPawn()) : nullptr;
    if (Student != nullptr && Student->HasRosterSlot())
    {
        DrawText(FString::Printf(TEXT("Controlled roster slot: %02d %s"), Student->GetStudentIndex(), *Student->GetStudentName().ToString()), FColor(214, 240, 194), X, Y, Font);
        Y += LineHeight;
    }

    if (Student != nullptr && !Student->GetStatusText().IsEmpty())
    {
        DrawText(Student->GetStatusText(), FColor(176, 230, 255), X, Y, Font);
    }
}
