#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "CliffwaldHud.generated.h"

UCLASS()
class CLIFFWALD_API ACliffwaldHud : public AHUD
{
    GENERATED_BODY()

public:
    virtual void BeginPlay() override;
    virtual void DrawHUD() override;
};
