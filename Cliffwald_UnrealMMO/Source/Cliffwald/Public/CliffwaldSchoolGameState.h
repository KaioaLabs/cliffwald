#pragma once

#include "CoreMinimal.h"
#include "CliffwaldStudentTypes.h"
#include "GameFramework/GameStateBase.h"
#include "CliffwaldSchoolGameState.generated.h"

class FLifetimeProperty;

UCLASS()
class CLIFFWALD_API ACliffwaldSchoolGameState : public AGameStateBase
{
    GENERATED_BODY()

public:
    ACliffwaldSchoolGameState();

    virtual void Tick(float DeltaSeconds) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    int32 GetDayIndex() const { return DayIndex; }
    int32 GetSchoolMinute() const { return SchoolMinute; }
    ECliffwaldSchoolPhase GetCurrentPhase() const { return CurrentPhase; }

    FString GetClockLabel() const;
    FString GetPhaseLabel() const;

    static ECliffwaldSchoolPhase PhaseForMinute(int32 MinuteOfDay);
    static const TCHAR* GetPhaseName(ECliffwaldSchoolPhase Phase);

private:
    void AdvanceSchoolMinutes(int32 MinutesToAdvance);
    void ApplyClock(int32 InDayIndex, int32 InSchoolMinute);

    UPROPERTY(Replicated, VisibleAnywhere, Category = "Cliffwald|School")
    int32 DayIndex = 1;

    UPROPERTY(Replicated, VisibleAnywhere, Category = "Cliffwald|School")
    int32 SchoolMinute = 6 * 60 + 20;

    UPROPERTY(Replicated, VisibleAnywhere, Category = "Cliffwald|School")
    ECliffwaldSchoolPhase CurrentPhase = ECliffwaldSchoolPhase::Sleep;

    UPROPERTY(EditDefaultsOnly, Category = "Cliffwald|School", meta = (ClampMin = "0.1", ClampMax = "120.0"))
    float GameMinutesPerRealSecond = 4.0f;

    UPROPERTY(Transient)
    float MinuteAccumulator = 0.0f;
};
