#pragma once

#include "CoreMinimal.h"
#include "CliffwaldStudentTypes.h"
#include "GameFramework/GameStateBase.h"
#include "CliffwaldSchoolGameState.generated.h"

class FLifetimeProperty;

UCLASS(Config = Game)
class CLIFFWALD_API ACliffwaldSchoolGameState : public AGameStateBase
{
    GENERATED_BODY()

public:
    ACliffwaldSchoolGameState();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    int32 GetDayIndex() const { return DayIndex; }
    int32 GetSchoolMinute() const { return SchoolMinute; }
    ECliffwaldSchoolPhase GetCurrentPhase() const { return CurrentPhase; }
    float GetRealMinutesPerSchoolDay() const { return RealMinutesPerSchoolDay; }
    float GetGameMinutesPerRealSecond() const;

    FString GetClockLabel() const;
    FString GetPhaseLabel() const;

    static ECliffwaldSchoolPhase PhaseForMinute(int32 MinuteOfDay);
    static const TCHAR* GetPhaseName(ECliffwaldSchoolPhase Phase);

private:
    void ApplyRuntimeClockOverrides();
    void AdvanceSchoolMinutes(int32 MinutesToAdvance);
    void ApplyClock(int32 InDayIndex, int32 InSchoolMinute);

    UPROPERTY(Replicated, VisibleAnywhere, Category = "Cliffwald|School")
    int32 DayIndex = 1;

    UPROPERTY(Replicated, VisibleAnywhere, Category = "Cliffwald|School")
    int32 SchoolMinute = 6 * 60 + 20;

    UPROPERTY(Replicated, VisibleAnywhere, Category = "Cliffwald|School")
    ECliffwaldSchoolPhase CurrentPhase = ECliffwaldSchoolPhase::Sleep;

    UPROPERTY(Config, Replicated, EditDefaultsOnly, Category = "Cliffwald|School", meta = (ClampMin = "0.1", ClampMax = "1440.0", Units = "Minutes"))
    float RealMinutesPerSchoolDay = 6.0f;

    UPROPERTY(Transient)
    float MinuteAccumulator = 0.0f;
};
