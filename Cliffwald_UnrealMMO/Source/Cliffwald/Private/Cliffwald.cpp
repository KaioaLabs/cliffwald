#include "Cliffwald.h"
#include "Modules/ModuleManager.h"

DEFINE_LOG_CATEGORY(LogCliffwald);

class FCliffwaldModule final : public FDefaultGameModuleImpl
{
public:
	virtual void StartupModule() override
	{
		FDefaultGameModuleImpl::StartupModule();

		// Network metrics can otherwise load PerfCounters on the first runtime tick, after Iris has
		// already created its ReplicationSystem. Preloading keeps Iris serializer registration stable.
#if !WITH_EDITOR
		FModuleManager::Get().LoadModule(TEXT("PerfCounters"));
#if !UE_BUILD_SHIPPING
		FModuleManager::Get().LoadModule(TEXT("AutomationWorker"));
		FModuleManager::Get().LoadModule(TEXT("AutomationController"));
#endif
#endif
	}
};

IMPLEMENT_PRIMARY_GAME_MODULE(FCliffwaldModule, Cliffwald, "Cliffwald");
