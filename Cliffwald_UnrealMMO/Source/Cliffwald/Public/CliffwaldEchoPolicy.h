#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "CliffwaldStudentTypes.h"
#include "CliffwaldEchoPolicy.generated.h"

UCLASS()
class CLIFFWALD_API UCliffwaldEchoPolicy : public UObject
{
    GENERATED_BODY()

public:
    static bool IsPersistentMutation(ECliffwaldMutationType MutationType);
    static bool CanApplyMutation(const FCliffwaldMutationContext& Context);
    static FString DescribeDeniedMutation(const FCliffwaldMutationContext& Context);
};
