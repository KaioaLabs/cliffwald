using UnrealBuildTool;
using System.Collections.Generic;

public class CliffwaldEditorTarget : TargetRules
{
    public CliffwaldEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V7;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;
        ExtraModuleNames.AddRange(new string[] { "Cliffwald" });
    }
}
