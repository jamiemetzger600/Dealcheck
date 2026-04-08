Instance created. Preparing to start...
Application exited with code 1. This usually indicates an application failure. Check that the command used to launch your application is correct.
Instance is starting... Waiting for health checks to pass.
Application exited with code 1. This usually indicates an application failure. Check that the command used to launch your application is correct.
Instance stopped.
Instance created. Preparing to start...

> dealcheck-backend@4.0.0 start
> node src/index.js

node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/shared/buyBoxMatcher.js' imported from /workspace/src/services/notificationScheduler.js
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:860:10)
    at defaultResolve (node:internal/modules/esm/resolve:984:11)
    at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:780:12)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:704:25)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:687:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:305:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:137:49) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///shared/buyBoxMatcher.js'
}

Node.js v22.15.1
Application exited with code 1. This usually indicates an application failure. Check that the command used to launch your application is correct.

> dealcheck-backend@4.0.0 start
> node src/index.js

node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/shared/buyBoxMatcher.js' imported from /workspace/src/services/notificationScheduler.js
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:860:10)
    at defaultResolve (node:internal/modules/esm/resolve:984:11)
Instance is starting... Waiting for health checks to pass.
    at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:780:12)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:704:25)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:687:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:305:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:137:49) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///shared/buyBoxMatcher.js'
}

Node.js v22.15.1
Application exited with code 1. This usually indicates an application failure. Check that the command used to launch your application is correct.
Instance stopped.