using UnrealBuildTool;

public class Cliffwald : ModuleRules
{
    public Cliffwald(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[]
            {
                "Core",
                "CoreUObject",
                "Engine",
                "InputCore",
                "EnhancedInput",
                "IrisCore",
                "AIModule",
                "GameplayTasks",
                "NavigationSystem",
                "UMG"
            }
        );
    }
}
