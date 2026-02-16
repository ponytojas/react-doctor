export const GIANT_COMPONENT_LINE_THRESHOLD = 200;
export const CASCADING_SET_STATE_THRESHOLD = 2;
export const RELATED_USE_STATE_THRESHOLD = 3;
export const DEEP_NESTING_THRESHOLD = 3;
export const DUPLICATE_STORAGE_READ_THRESHOLD = 2;
export const SEQUENTIAL_AWAIT_THRESHOLD = 2;
export const SECRET_MIN_LENGTH = 8;
export const AUTH_CHECK_LOOKAHEAD_STATEMENTS = 3;

export const LAYOUT_PROPERTIES = new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "borderWidth",
  "fontSize",
  "lineHeight",
  "gap",
]);

export const MOTION_ANIMATE_PROPS = new Set([
  "animate",
  "initial",
  "exit",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
]);

export const HEAVY_LIBRARIES = new Set([
  "@monaco-editor/react",
  "monaco-editor",
  "recharts",
  "@react-pdf/renderer",
  "react-quill",
  "@codemirror/view",
  "@codemirror/state",
  "chart.js",
  "react-chartjs-2",
  "@toast-ui/editor",
  "draft-js",
]);

export const FETCH_CALLEE_NAMES = new Set(["fetch"]);
export const FETCH_MEMBER_OBJECTS = new Set(["axios", "ky", "got"]);
export const INDEX_PARAMETER_NAMES = new Set(["index", "idx", "i"]);
export const BARREL_INDEX_SUFFIXES = [
  "/index",
  "/index.js",
  "/index.ts",
  "/index.tsx",
  "/index.mjs",
];
export const PASSIVE_EVENT_NAMES = new Set([
  "scroll",
  "wheel",
  "touchstart",
  "touchmove",
  "touchend",
]);

export const LOOP_TYPES = [
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
];

export const AUTH_FUNCTION_NAMES = new Set([
  "auth",
  "getSession",
  "getServerSession",
  "getUser",
  "requireAuth",
  "checkAuth",
  "verifyAuth",
  "authenticate",
  "currentUser",
  "getAuth",
  "validateSession",
]);

export const SECRET_PATTERNS = [
  /^sk_live_/,
  /^sk_test_/,
  /^AKIA[0-9A-Z]{16}$/,
  /^ghp_[a-zA-Z0-9]{36}$/,
  /^gho_[a-zA-Z0-9]{36}$/,
  /^github_pat_/,
  /^glpat-/,
  /^xox[bporas]-/,
  /^sk-[a-zA-Z0-9]{32,}$/,
];

export const SECRET_VARIABLE_PATTERN = /(?:api_?key|secret|token|password|credential|auth)/i;

export const LOADING_STATE_PATTERN = /(?:loading|isLoading|isPending|isSubmitting|isFetching)/i;

export const EVENT_PROP_PATTERN = /^on[A-Z]/;
export const SETTER_PATTERN = /^set[A-Z]/;
export const RENDER_FUNCTION_PATTERN = /^render[A-Z]/;
export const UPPERCASE_PATTERN = /^[A-Z]/;
export const PAGE_FILE_PATTERN = /\/page\.(tsx?|jsx?)$/;
export const PAGE_OR_LAYOUT_FILE_PATTERN = /\/(page|layout)\.(tsx?|jsx?)$/;
export const PAGES_DIRECTORY_PATTERN = /\/pages\//;
export const SERVER_ACTION_FILE_PATTERN = /actions?\.(tsx?|jsx?)$/;
export const SERVER_ACTION_DIRECTORY_PATTERN = /\/actions\//;

export const NEXTJS_NAVIGATION_FUNCTIONS = new Set([
  "redirect",
  "permanentRedirect",
  "notFound",
  "forbidden",
  "unauthorized",
]);

export const GOOGLE_FONTS_PATTERN = /fonts\.googleapis\.com/;

export const POLYFILL_SCRIPT_PATTERN = /polyfill\.io|polyfill\.min\.js|cdn\.polyfill/;

export const APP_DIRECTORY_PATTERN = /\/app\//;

export const EFFECT_HOOK_NAMES = new Set(["useEffect", "useLayoutEffect"]);
export const HOOKS_WITH_DEPS = new Set(["useEffect", "useLayoutEffect", "useMemo", "useCallback"]);
export const CHAINABLE_ITERATION_METHODS = new Set(["map", "filter", "forEach", "flatMap"]);
export const STORAGE_OBJECTS = new Set(["localStorage", "sessionStorage"]);

export const LARGE_BLUR_THRESHOLD_PX = 10;
export const BLUR_VALUE_PATTERN = /blur\((\d+(?:\.\d+)?)px\)/;
export const ANIMATION_CALLBACK_NAMES = new Set(["requestAnimationFrame", "setInterval"]);
export const MOTION_LIBRARY_PACKAGES = new Set(["framer-motion", "motion"]);
