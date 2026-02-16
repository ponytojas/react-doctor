import {
  noGiantComponent,
  noGenericHandlerNames,
  noNestedComponentDefinition,
  noRenderInRender,
} from "./rules/architecture.js";
import {
  noBarrelImport,
  noFullLodashImport,
  noMoment,
  noUndeferredThirdParty,
  preferDynamicImport,
  useLazyMotion,
} from "./rules/bundle-size.js";
import { clientPassiveEventListeners } from "./rules/client.js";
import {
  noArrayIndexAsKey,
  noPreventDefault,
  renderingConditionalRender,
} from "./rules/correctness.js";
import {
  asyncParallel,
  jsBatchDomCss,
  jsCacheStorage,
  jsCombineIterations,
  jsEarlyExit,
  jsHoistRegexp,
  jsIndexMaps,
  jsMinMaxLoop,
  jsSetMapLookups,
  jsTosortedImmutable,
} from "./rules/js-performance.js";
import {
  nextjsAsyncClientComponent,
  nextjsMissingMetadata,
  nextjsNoAElement,
  nextjsNoClientFetchForServerData,
  nextjsNoClientSideRedirect,
  nextjsNoImgElement,
  nextjsNoUseSearchParamsWithoutSuspense,
} from "./rules/nextjs.js";
import {
  noLayoutPropertyAnimation,
  noUsememoSimpleExpression,
  renderingAnimateSvgWrapper,
  renderingHydrationNoFlicker,
  renderingUsetransitionLoading,
  rerenderMemoWithDefaultValue,
} from "./rules/performance.js";
import { noEval, noSecretsInClientCode } from "./rules/security.js";
import { serverAfterNonblocking, serverAuthActions } from "./rules/server.js";
import {
  noCascadingSetState,
  noDerivedStateEffect,
  noDerivedUseState,
  noEffectEventHandler,
  noFetchInEffect,
  preferUseReducer,
  rerenderDependencies,
  rerenderFunctionalSetstate,
  rerenderLazyStateInit,
} from "./rules/state-and-effects.js";
import type { RulePlugin } from "./types.js";

const plugin: RulePlugin = {
  meta: { name: "react-doctor" },
  rules: {
    "no-derived-state-effect": noDerivedStateEffect,
    "no-fetch-in-effect": noFetchInEffect,
    "no-cascading-set-state": noCascadingSetState,
    "no-effect-event-handler": noEffectEventHandler,
    "no-derived-useState": noDerivedUseState,
    "prefer-useReducer": preferUseReducer,
    "rerender-lazy-state-init": rerenderLazyStateInit,
    "rerender-functional-setstate": rerenderFunctionalSetstate,
    "rerender-dependencies": rerenderDependencies,

    "no-generic-handler-names": noGenericHandlerNames,
    "no-giant-component": noGiantComponent,
    "no-render-in-render": noRenderInRender,
    "no-nested-component-definition": noNestedComponentDefinition,

    "no-usememo-simple-expression": noUsememoSimpleExpression,
    "no-layout-property-animation": noLayoutPropertyAnimation,
    "rerender-memo-with-default-value": rerenderMemoWithDefaultValue,
    "rendering-animate-svg-wrapper": renderingAnimateSvgWrapper,
    "rendering-usetransition-loading": renderingUsetransitionLoading,
    "rendering-hydration-no-flicker": renderingHydrationNoFlicker,

    "no-eval": noEval,
    "no-secrets-in-client-code": noSecretsInClientCode,

    "no-barrel-import": noBarrelImport,
    "no-full-lodash-import": noFullLodashImport,
    "no-moment": noMoment,
    "prefer-dynamic-import": preferDynamicImport,
    "use-lazy-motion": useLazyMotion,
    "no-undeferred-third-party": noUndeferredThirdParty,

    "no-array-index-as-key": noArrayIndexAsKey,
    "rendering-conditional-render": renderingConditionalRender,
    "no-prevent-default": noPreventDefault,

    "nextjs-no-img-element": nextjsNoImgElement,
    "nextjs-async-client-component": nextjsAsyncClientComponent,
    "nextjs-no-a-element": nextjsNoAElement,
    "nextjs-no-use-search-params-without-suspense": nextjsNoUseSearchParamsWithoutSuspense,
    "nextjs-no-client-fetch-for-server-data": nextjsNoClientFetchForServerData,
    "nextjs-missing-metadata": nextjsMissingMetadata,
    "nextjs-no-client-side-redirect": nextjsNoClientSideRedirect,

    "server-auth-actions": serverAuthActions,
    "server-after-nonblocking": serverAfterNonblocking,

    "client-passive-event-listeners": clientPassiveEventListeners,

    "js-combine-iterations": jsCombineIterations,
    "js-tosorted-immutable": jsTosortedImmutable,
    "js-hoist-regexp": jsHoistRegexp,
    "js-min-max-loop": jsMinMaxLoop,
    "js-set-map-lookups": jsSetMapLookups,
    "js-batch-dom-css": jsBatchDomCss,
    "js-index-maps": jsIndexMaps,
    "js-cache-storage": jsCacheStorage,
    "js-early-exit": jsEarlyExit,
    "async-parallel": asyncParallel,
  },
};

export default plugin;
