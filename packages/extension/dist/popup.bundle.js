"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../../node_modules/zod/v3/external.js
  var external_exports = {};
  __export(external_exports, {
    BRAND: () => BRAND,
    DIRTY: () => DIRTY,
    EMPTY_PATH: () => EMPTY_PATH,
    INVALID: () => INVALID,
    NEVER: () => NEVER,
    OK: () => OK,
    ParseStatus: () => ParseStatus,
    Schema: () => ZodType,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBigInt: () => ZodBigInt,
    ZodBoolean: () => ZodBoolean,
    ZodBranded: () => ZodBranded,
    ZodCatch: () => ZodCatch,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodEffects: () => ZodEffects,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNativeEnum: () => ZodNativeEnum,
    ZodNever: () => ZodNever,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodParsedType: () => ZodParsedType,
    ZodPipeline: () => ZodPipeline,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRecord: () => ZodRecord,
    ZodSchema: () => ZodType,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodSymbol: () => ZodSymbol,
    ZodTransformer: () => ZodEffects,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    addIssueToContext: () => addIssueToContext,
    any: () => anyType,
    array: () => arrayType,
    bigint: () => bigIntType,
    boolean: () => booleanType,
    coerce: () => coerce,
    custom: () => custom,
    date: () => dateType,
    datetimeRegex: () => datetimeRegex,
    defaultErrorMap: () => en_default,
    discriminatedUnion: () => discriminatedUnionType,
    effect: () => effectsType,
    enum: () => enumType,
    function: () => functionType,
    getErrorMap: () => getErrorMap,
    getParsedType: () => getParsedType,
    instanceof: () => instanceOfType,
    intersection: () => intersectionType,
    isAborted: () => isAborted,
    isAsync: () => isAsync,
    isDirty: () => isDirty,
    isValid: () => isValid,
    late: () => late,
    lazy: () => lazyType,
    literal: () => literalType,
    makeIssue: () => makeIssue,
    map: () => mapType,
    nan: () => nanType,
    nativeEnum: () => nativeEnumType,
    never: () => neverType,
    null: () => nullType,
    nullable: () => nullableType,
    number: () => numberType,
    object: () => objectType,
    objectUtil: () => objectUtil,
    oboolean: () => oboolean,
    onumber: () => onumber,
    optional: () => optionalType,
    ostring: () => ostring,
    pipeline: () => pipelineType,
    preprocess: () => preprocessType,
    promise: () => promiseType,
    quotelessJson: () => quotelessJson,
    record: () => recordType,
    set: () => setType,
    setErrorMap: () => setErrorMap,
    strictObject: () => strictObjectType,
    string: () => stringType,
    symbol: () => symbolType,
    transformer: () => effectsType,
    tuple: () => tupleType,
    undefined: () => undefinedType,
    union: () => unionType,
    unknown: () => unknownType,
    util: () => util,
    void: () => voidType
  });

  // ../../node_modules/zod/v3/helpers/util.js
  var util;
  (function(util2) {
    util2.assertEqual = (_) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return void 0;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      };
    };
  })(objectUtil || (objectUtil = {}));
  var ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        if (Array.isArray(data)) {
          return ZodParsedType.array;
        }
        if (data === null) {
          return ZodParsedType.null;
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return ZodParsedType.promise;
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return ZodParsedType.map;
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return ZodParsedType.set;
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return ZodParsedType.date;
        }
        return ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };

  // ../../node_modules/zod/v3/ZodError.js
  var ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
  };
  var ZodError = class _ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue.path.length) {
              const el = issue.path[i];
              const terminal = i === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof _ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };

  // ../../node_modules/zod/v3/locales/en.js
  var errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = "Required";
        } else {
          message = `Expected ${issue.expected}, received ${issue.received}`;
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date`;
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === "object") {
          if ("includes" in issue.validation) {
            message = `Invalid input: must include "${issue.validation.includes}"`;
            if (typeof issue.validation.position === "number") {
              message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
            }
          } else if ("startsWith" in issue.validation) {
            message = `Invalid input: must start with "${issue.validation.startsWith}"`;
          } else if ("endsWith" in issue.validation) {
            message = `Invalid input: must end with "${issue.validation.endsWith}"`;
          } else {
            util.assertNever(issue.validation);
          }
        } else if (issue.validation !== "regex") {
          message = `Invalid ${issue.validation}`;
        } else {
          message = "Invalid";
        }
        break;
      case ZodIssueCode.too_small:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "bigint")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "bigint")
          message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError;
        util.assertNever(issue);
    }
    return { message };
  };
  var en_default = errorMap;

  // ../../node_modules/zod/v3/errors.js
  var overrideErrorMap = en_default;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }

  // ../../node_modules/zod/v3/helpers/parseUtil.js
  var makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...issueData.path || []];
    const fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    }
    let errorMessage = "";
    const maps = errorMaps.filter((m) => !!m).slice().reverse();
    for (const map of maps) {
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  };
  var EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === en_default ? void 0 : en_default
        // then global default map
      ].filter((x) => !!x)
    });
    ctx.common.issues.push(issue);
  }
  var ParseStatus = class _ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      if (this.value === "valid")
        this.value = "dirty";
    }
    abort() {
      if (this.value !== "aborted")
        this.value = "aborted";
    }
    static mergeArray(status, results) {
      const arrayValue = [];
      for (const s of results) {
        if (s.status === "aborted")
          return INVALID;
        if (s.status === "dirty")
          status.dirty();
        arrayValue.push(s.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = [];
      for (const pair of pairs) {
        const key = await pair.key;
        const value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return _ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {};
      for (const pair of pairs) {
        const { key, value } = pair;
        if (key.status === "aborted")
          return INVALID;
        if (value.status === "aborted")
          return INVALID;
        if (key.status === "dirty")
          status.dirty();
        if (value.status === "dirty")
          status.dirty();
        if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
          finalObject[key.value] = value.value;
        }
      }
      return { status: status.value, value: finalObject };
    }
  };
  var INVALID = Object.freeze({
    status: "aborted"
  });
  var DIRTY = (value) => ({ status: "dirty", value });
  var OK = (value) => ({ status: "valid", value });
  var isAborted = (x) => x.status === "aborted";
  var isDirty = (x) => x.status === "dirty";
  var isValid = (x) => x.status === "valid";
  var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

  // ../../node_modules/zod/v3/helpers/errorUtil.js
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));

  // ../../node_modules/zod/v3/types.js
  var ParseInputLazyPath = class {
    constructor(parent, value, path, key) {
      this._cachedPath = [];
      this.parent = parent;
      this.data = value;
      this._path = path;
      this._key = key;
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key);
        } else {
          this._cachedPath.push(...this._path, this._key);
        }
      }
      return this._cachedPath;
    }
  };
  var handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
      return {
        success: false,
        get error() {
          if (this._error)
            return this._error;
          const error = new ZodError(ctx.common.issues);
          this._error = error;
          return this._error;
        }
      };
    }
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap2)
      return { errorMap: errorMap2, description };
    const customMap = (iss, ctx) => {
      const { message } = params;
      if (iss.code === "invalid_enum_value") {
        return { message: message ?? ctx.defaultError };
      }
      if (typeof ctx.data === "undefined") {
        return { message: message ?? required_error ?? ctx.defaultError };
      }
      if (iss.code !== "invalid_type")
        return { message: ctx.defaultError };
      return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description };
  }
  var ZodType = class {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      const result = this._parse(input);
      if (isAsync(result)) {
        throw new Error("Synchronous parse encountered promise.");
      }
      return result;
    }
    _parseAsync(input) {
      const result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      const result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      const ctx = {
        common: {
          issues: [],
          async: params?.async ?? false,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      const ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async) {
        try {
          const result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          if (err?.message?.toLowerCase()?.includes("encountered")) {
            this["~standard"].async = true;
          }
          ctx.common = {
            issues: [],
            async: true
          };
        }
      }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      const result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: true
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check, message) {
      const getIssueProperties = (val) => {
        if (typeof message === "string" || typeof message === "undefined") {
          return { message };
        } else if (typeof message === "function") {
          return message(val);
        } else {
          return message;
        }
      };
      return this._refinement((val, ctx) => {
        const result = check(val);
        const setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then((data) => {
            if (!data) {
              setError();
              return false;
            } else {
              return true;
            }
          });
        }
        if (!result) {
          setError();
          return false;
        } else {
          return true;
        }
      });
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check(val)) {
          ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
          return false;
        } else {
          return true;
        }
      });
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync;
      this._def = def;
      this.parse = this.parse.bind(this);
      this.safeParse = this.safeParse.bind(this);
      this.parseAsync = this.parseAsync.bind(this);
      this.safeParseAsync = this.safeParseAsync.bind(this);
      this.spa = this.spa.bind(this);
      this.refine = this.refine.bind(this);
      this.refinement = this.refinement.bind(this);
      this.superRefine = this.superRefine.bind(this);
      this.optional = this.optional.bind(this);
      this.nullable = this.nullable.bind(this);
      this.nullish = this.nullish.bind(this);
      this.array = this.array.bind(this);
      this.promise = this.promise.bind(this);
      this.or = this.or.bind(this);
      this.and = this.and.bind(this);
      this.transform = this.transform.bind(this);
      this.brand = this.brand.bind(this);
      this.default = this.default.bind(this);
      this.catch = this.catch.bind(this);
      this.describe = this.describe.bind(this);
      this.pipe = this.pipe.bind(this);
      this.readonly = this.readonly.bind(this);
      this.isNullable = this.isNullable.bind(this);
      this.isOptional = this.isOptional.bind(this);
      this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform }
      });
    }
    default(def) {
      const defaultValueFunc = typeof def === "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      const catchValueFunc = typeof def === "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description) {
      const This = this.constructor;
      return new This({
        ...this._def,
        description
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  var cuidRegex = /^c[^\s-]{8,}$/i;
  var cuid2Regex = /^[0-9a-z]+$/;
  var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  var nanoidRegex = /^[a-z0-9_-]{21}$/i;
  var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  var emojiRegex;
  var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
  var dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
      opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return false;
    try {
      const [header] = jwt.split(".");
      if (!header)
        return false;
      const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
      const decoded = JSON.parse(atob(base64));
      if (typeof decoded !== "object" || decoded === null)
        return false;
      if ("typ" in decoded && decoded?.typ !== "JWT")
        return false;
      if (!decoded.alg)
        return false;
      if (alg && decoded.alg !== alg)
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
      return true;
    }
    return false;
  }
  var ZodString = class _ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min2 === null || ch.value > min2)
            min2 = ch.value;
        }
      }
      return min2;
    }
    get maxLength() {
      let max2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max2 === null || ch.value < max2)
            max2 = ch.value;
        }
      }
      return max2;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var ZodNumber = class _ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min2 === null || ch.value > min2)
            min2 = ch.value;
        }
      }
      return min2;
    }
    get maxValue() {
      let max2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max2 === null || ch.value < max2)
            max2 = ch.value;
        }
      }
      return max2;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max2 = null;
      let min2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min2 === null || ch.value > min2)
            min2 = ch.value;
        } else if (ch.kind === "max") {
          if (max2 === null || ch.value < max2)
            max2 = ch.value;
        }
      }
      return Number.isFinite(min2) && Number.isFinite(max2);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodBigInt = class _ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min2 === null || ch.value > min2)
            min2 = ch.value;
        }
      }
      return min2;
    }
    get maxValue() {
      let max2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max2 === null || ch.value < max2)
            max2 = ch.value;
        }
      }
      return max2;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  var ZodBoolean = class extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodDate = class _ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new _ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min2 === null || ch.value > min2)
            min2 = ch.value;
        }
      }
      return min2 != null ? new Date(min2) : null;
    }
    get maxDate() {
      let max2 = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max2 === null || ch.value < max2)
            max2 = ch.value;
        }
      }
      return max2 != null ? new Date(max2) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  var ZodSymbol = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  var ZodUndefined = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  var ZodNull = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  var ZodAny = class extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  var ZodUnknown = class extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  var ZodNever = class extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  var ZodVoid = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  var ZodArray = class _ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : void 0,
            maximum: tooBig ? def.exactLength.value : void 0,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new _ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new _ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new _ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {};
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      });
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    } else {
      return schema;
    }
  }
  var ZodObject = class _ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {
        } else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new _ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      const merged = new _ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new _ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  var ZodUnion = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = void 0;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  var getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
      return getDiscriminator(type.schema);
    } else if (type instanceof ZodEffects) {
      return getDiscriminator(type.innerType());
    } else if (type instanceof ZodLiteral) {
      return [type.value];
    } else if (type instanceof ZodEnum) {
      return type.options;
    } else if (type instanceof ZodNativeEnum) {
      return util.objectValues(type.enum);
    } else if (type instanceof ZodDefault) {
      return getDiscriminator(type._def.innerType);
    } else if (type instanceof ZodUndefined) {
      return [void 0];
    } else if (type instanceof ZodNull) {
      return [null];
    } else if (type instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodNullable) {
      return [null, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodBranded) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodReadonly) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodCatch) {
      return getDiscriminator(type._def.innerType);
    } else {
      return [];
    }
  };
  var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
      const optionsMap = /* @__PURE__ */ new Map();
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new _ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
      return { valid: true, data: a };
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util.objectKeys(b);
      const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length) {
        return { valid: false };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
      return { valid: true, data: a };
    } else {
      return { valid: false };
    }
  }
  var ZodIntersection = class extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left2, right2]) => handleParsed(left2, right2));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left2, right2, params) => {
    return new ZodIntersection({
      left: left2,
      right: right2,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  var ZodTuple = class _ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new _ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  var ZodRecord = class _ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new _ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new _ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  var ZodMap = class extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = /* @__PURE__ */ new Map();
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  var ZodSet = class _ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set();
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new _ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new _ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  var ZodFunction = class _ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn2 = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result = await Reflect.apply(fn2, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn2, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new _ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new _ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new _ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  var ZodLazy = class extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  var ZodLiteral = class extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  var ZodEnum = class _ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return _ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  var ZodNativeEnum = class extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  var ZodPromise = class extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  var ZodEffects = class extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect4 = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect4.type === "preprocess") {
        const processed = effect4.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect4.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect4.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect4.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect4.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect4.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect4);
    }
  };
  ZodEffects.create = (schema, effect4, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: effect4,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  var ZodOptional = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  var ZodNullable = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  var ZodDefault = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  var ZodCatch = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  var ZodNaN = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  var BRAND = Symbol("zod_brand");
  var ZodBranded = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  var ZodPipeline = class _ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new _ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  var ZodReadonly = class extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  function cleanParams(params, data) {
    const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
    const p2 = typeof p === "string" ? { message: p } : p;
    return p2;
  }
  function custom(check, _params = {}, fatal) {
    if (check)
      return ZodAny.create().superRefine((data, ctx) => {
        const r = check(data);
        if (r instanceof Promise) {
          return r.then((r2) => {
            if (!r2) {
              const params = cleanParams(_params, data);
              const _fatal = params.fatal ?? fatal ?? true;
              ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
          });
        }
        if (!r) {
          const params = cleanParams(_params, data);
          const _fatal = params.fatal ?? fatal ?? true;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
        return;
      });
    return ZodAny.create();
  }
  var late = {
    object: ZodObject.lazycreate
  };
  var ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  var instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params);
  var stringType = ZodString.create;
  var numberType = ZodNumber.create;
  var nanType = ZodNaN.create;
  var bigIntType = ZodBigInt.create;
  var booleanType = ZodBoolean.create;
  var dateType = ZodDate.create;
  var symbolType = ZodSymbol.create;
  var undefinedType = ZodUndefined.create;
  var nullType = ZodNull.create;
  var anyType = ZodAny.create;
  var unknownType = ZodUnknown.create;
  var neverType = ZodNever.create;
  var voidType = ZodVoid.create;
  var arrayType = ZodArray.create;
  var objectType = ZodObject.create;
  var strictObjectType = ZodObject.strictCreate;
  var unionType = ZodUnion.create;
  var discriminatedUnionType = ZodDiscriminatedUnion.create;
  var intersectionType = ZodIntersection.create;
  var tupleType = ZodTuple.create;
  var recordType = ZodRecord.create;
  var mapType = ZodMap.create;
  var setType = ZodSet.create;
  var functionType = ZodFunction.create;
  var lazyType = ZodLazy.create;
  var literalType = ZodLiteral.create;
  var enumType = ZodEnum.create;
  var nativeEnumType = ZodNativeEnum.create;
  var promiseType = ZodPromise.create;
  var effectsType = ZodEffects.create;
  var optionalType = ZodOptional.create;
  var nullableType = ZodNullable.create;
  var preprocessType = ZodEffects.createWithPreprocess;
  var pipelineType = ZodPipeline.create;
  var ostring = () => stringType().optional();
  var onumber = () => numberType().optional();
  var oboolean = () => booleanType().optional();
  var coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  };
  var NEVER = INVALID;

  // ../shared-core/dist/types/event.js
  var EventDataSchema = external_exports.object({
    uid: external_exports.string().optional(),
    summary: external_exports.string(),
    description: external_exports.string().optional(),
    htmlDescription: external_exports.string().optional(),
    location: external_exports.string().optional(),
    dtstart: external_exports.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    dtend: external_exports.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date"),
    timezone: external_exports.string().default("America/Los_Angeles"),
    isAllDay: external_exports.boolean().default(false),
    status: external_exports.enum(["confirmed", "tentative"]).default("confirmed"),
    url: external_exports.string().url().optional(),
    organizer: external_exports.object({
      email: external_exports.string().email(),
      name: external_exports.string().optional()
    }).optional()
  });
  var MultiDayEventsSchema = external_exports.array(EventDataSchema);
  var ParsingInputSchema = external_exports.object({
    html: external_exports.string().optional(),
    text: external_exports.string().optional(),
    url: external_exports.string().url().optional(),
    screenshot: external_exports.string().optional(),
    // Base64 data URL
    source: external_exports.enum(["email", "webpage", "manual"]).default("webpage")
  });
  var ExtractionResultSchema = external_exports.object({
    events: external_exports.array(EventDataSchema),
    confidence: external_exports.number().min(0).max(1),
    source: external_exports.string(),
    model: external_exports.string(),
    timestamp: external_exports.number(),
    needsReview: external_exports.boolean().default(false),
    confirmationToken: external_exports.string().optional()
  });
  var IcsConfigSchema = external_exports.object({
    method: external_exports.enum(["PUBLISH", "REQUEST"]).default("PUBLISH"),
    includeHtmlDescription: external_exports.boolean().default(true),
    prodId: external_exports.string().default("-//Email-to-ICS//Node.js//EN"),
    timezone: external_exports.string().default("America/Los_Angeles"),
    filename: external_exports.string().optional()
  });

  // ../shared-core/dist/lib/browser-ics-generator.js
  var BrowserIcsGenerator = class {
    /**
     * Generate ICS content from events
     */
    generateIcs(events, config = {}, fromEmail) {
      const { method = "PUBLISH", includeHtmlDescription = true, filename = "events" } = config;
      const now = /* @__PURE__ */ new Date();
      const timestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      let ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Email-to-ICS//Chrome Extension//EN",
        `METHOD:${method}`,
        "CALSCALE:GREGORIAN"
      ];
      events.forEach((event, index) => {
        const eventId = this.generateEventId(event, index);
        const startDate = this.formatDateTime(new Date(event.dtstart), event.timezone, event.isAllDay);
        const endDate = event.dtend ? this.formatDateTime(new Date(event.dtend), event.timezone, event.isAllDay) : this.formatDateTime(new Date(new Date(event.dtstart).getTime() + 36e5), event.timezone, event.isAllDay);
        ics.push("BEGIN:VEVENT");
        ics.push(`UID:${eventId}`);
        ics.push(`DTSTAMP:${timestamp}`);
        ics.push(`DTSTART${this.getDateTimePrefix(event.timezone, event.isAllDay)}:${startDate}`);
        ics.push(`DTEND${this.getDateTimePrefix(event.timezone, event.isAllDay)}:${endDate}`);
        ics.push(`SUMMARY:${this.escapeText(event.summary)}`);
        if (event.description) {
          ics.push(`DESCRIPTION:${this.escapeText(event.description)}`);
        }
        if (event.location) {
          ics.push(`LOCATION:${this.escapeText(event.location)}`);
        }
        if (event.url) {
          ics.push(`URL:${event.url}`);
        }
        const status = event.status?.toUpperCase() || "CONFIRMED";
        ics.push(`STATUS:${status}`);
        if (fromEmail) {
          ics.push(`ORGANIZER:mailto:${fromEmail}`);
        }
        if (includeHtmlDescription && event.htmlDescription) {
          ics.push(`X-ALT-DESC;FMTTYPE=text/html:${this.escapeText(event.htmlDescription)}`);
        }
        ics.push("END:VEVENT");
      });
      ics.push("END:VCALENDAR");
      return ics.join("\r\n") + "\r\n";
    }
    /**
     * Validate ICS content
     */
    validateIcs(icsContent) {
      const errors = [];
      if (!icsContent.includes("BEGIN:VCALENDAR")) {
        errors.push("Missing BEGIN:VCALENDAR");
      }
      if (!icsContent.includes("END:VCALENDAR")) {
        errors.push("Missing END:VCALENDAR");
      }
      if (!icsContent.includes("VERSION:2.0")) {
        errors.push("Missing VERSION:2.0");
      }
      const beginEvents = (icsContent.match(/BEGIN:VEVENT/g) || []).length;
      const endEvents = (icsContent.match(/END:VEVENT/g) || []).length;
      if (beginEvents !== endEvents) {
        errors.push("Mismatched VEVENT blocks");
      }
      if (beginEvents === 0) {
        errors.push("No events found");
      }
      const events = icsContent.split("BEGIN:VEVENT").slice(1);
      events.forEach((event, index) => {
        if (!event.includes("UID:")) {
          errors.push(`Event ${index + 1}: Missing UID`);
        }
        if (!event.includes("DTSTART")) {
          errors.push(`Event ${index + 1}: Missing DTSTART`);
        }
        if (!event.includes("SUMMARY:")) {
          errors.push(`Event ${index + 1}: Missing SUMMARY`);
        }
      });
      return {
        valid: errors.length === 0,
        errors
      };
    }
    /**
     * Generate unique event ID
     */
    generateEventId(event, index) {
      const baseId = `${event.summary.replace(/\s+/g, "-").toLowerCase()}-${index}`;
      const timestamp = (/* @__PURE__ */ new Date()).getTime();
      return `${baseId}-${timestamp}@email-to-ics.extension`;
    }
    /**
     * Format date/time for ICS
     */
    formatDateTime(date, timezone, isAllDay) {
      if (isAllDay) {
        return date.toISOString().split("T")[0].replace(/-/g, "");
      }
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }
    /**
     * Get date/time prefix for ICS property
     */
    getDateTimePrefix(timezone, isAllDay) {
      if (isAllDay) {
        return ";VALUE=DATE";
      }
      if (timezone && timezone !== "UTC") {
        return `;TZID=${timezone}`;
      }
      return "";
    }
    /**
     * Escape text for ICS format
     */
    escapeText(text) {
      return text.replace(/\\\\/g, "\\\\\\\\").replace(/;/g, "\\\\;").replace(/\\n/g, "\\\\n").replace(/\\r/g, "").trim();
    }
    /**
     * Parse existing ICS content (basic parser)
     */
    parseIcs(icsContent) {
      const events = [];
      const eventBlocks = icsContent.split("BEGIN:VEVENT").slice(1);
      eventBlocks.forEach((block) => {
        const endIndex = block.indexOf("END:VEVENT");
        if (endIndex === -1)
          return;
        const eventContent = block.substring(0, endIndex);
        const event = this.parseEvent(eventContent);
        if (event) {
          events.push(event);
        }
      });
      return events;
    }
    /**
     * Parse individual event from ICS content
     */
    parseEvent(eventContent) {
      const lines = eventContent.split("\\n").map((line) => line.trim()).filter((line) => line);
      let event = {};
      lines.forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1)
          return;
        const property = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        switch (property.split(";")[0]) {
          case "SUMMARY":
            event.summary = this.unescapeText(value);
            break;
          case "DESCRIPTION":
            event.description = this.unescapeText(value);
            break;
          case "LOCATION":
            event.location = this.unescapeText(value);
            break;
          case "DTSTART":
            event.dtstart = this.parseIcsDateTime(value);
            event.isAllDay = property.includes("VALUE=DATE");
            break;
          case "DTEND":
            event.dtend = this.parseIcsDateTime(value);
            break;
          case "URL":
            event.url = value;
            break;
          case "STATUS":
            event.status = value.toLowerCase();
            break;
        }
      });
      if (!event.summary || !event.dtstart) {
        return null;
      }
      return event;
    }
    /**
     * Unescape ICS text
     */
    unescapeText(text) {
      return text.replace(/\\\\n/g, "\\n").replace(/\\\\,/g, ",").replace(/\\\\;/g, ";").replace(/\\\\\\\\/g, "\\\\");
    }
    /**
     * Parse ICS date/time string
     */
    parseIcsDateTime(value) {
      if (value.length === 8) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        return `${year}-${month}-${day}T00:00:00.000Z`;
      }
      if (value.length >= 15) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        const hour = value.substring(9, 11);
        const minute = value.substring(11, 13);
        const second = value.substring(13, 15);
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
      }
      return (/* @__PURE__ */ new Date()).toISOString();
    }
  };

  // ../shared-core/dist/adapters/base-adapters.js
  var BaseTimeAdapter = class {
    now() {
      return Date.now();
    }
    toISOString(date) {
      return date.toISOString();
    }
    parseDate(dateString, timezone) {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`);
      }
      return date;
    }
    formatForICS(date, timezone) {
      if (timezone && timezone !== "UTC") {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0];
      } else {
        return date.toISOString().replace(/[-:]/g, "").replace(".000", "");
      }
    }
  };
  var ConsoleLoggerAdapter = class {
    debug(message, ...args) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
    info(message, ...args) {
      console.info(`[INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
      console.warn(`[WARN] ${message}`, ...args);
    }
    error(message, error, ...args) {
      if (error) {
        console.error(`[ERROR] ${message}`, error, ...args);
      } else {
        console.error(`[ERROR] ${message}`, ...args);
      }
    }
  };

  // ../shared-core/dist/adapters/browser-adapters.js
  var BrowserHttpClient = class {
    async post(url, data, options = {}) {
      return this.request("POST", url, data, options);
    }
    async get(url, options = {}) {
      return this.request("GET", url, void 0, options);
    }
    async request(method, url, data, options = {}) {
      const controller = new AbortController();
      const timeout = options.timeout || 3e4;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          },
          body: data ? JSON.stringify(data) : void 0,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const responseData = await response.json();
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (options.retries && options.retries > 0) {
          const retryOptions = { ...options, retries: options.retries - 1 };
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          return this.request(method, url, data, retryOptions);
        }
        throw error;
      }
    }
  };
  var ChromeStorageAdapter = class {
    async get(key) {
      if (typeof chrome === "undefined" || !chrome.storage) {
        throw new Error("Chrome storage API not available");
      }
      const result = await chrome.storage.local.get([key]);
      const item = result[key];
      if (!item) {
        return null;
      }
      if (typeof item === "object" && item.value !== void 0) {
        if (item.expires && Date.now() > item.expires) {
          await this.delete(key);
          return null;
        }
        return item.value;
      }
      return item;
    }
    async set(key, value, ttl) {
      if (typeof chrome === "undefined" || !chrome.storage) {
        throw new Error("Chrome storage API not available");
      }
      const item = { value };
      if (ttl) {
        item.expires = Date.now() + ttl * 1e3;
      }
      await chrome.storage.local.set({ [key]: item });
    }
    async delete(key) {
      if (typeof chrome === "undefined" || !chrome.storage) {
        throw new Error("Chrome storage API not available");
      }
      await chrome.storage.local.remove([key]);
    }
    async clear() {
      if (typeof chrome === "undefined" || !chrome.storage) {
        throw new Error("Chrome storage API not available");
      }
      await chrome.storage.local.clear();
    }
  };
  var BrowserCryptoAdapter = class {
    randomUUID() {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    }
    async hash(data, algorithm = "SHA-256") {
      if (typeof crypto === "undefined" || !crypto.subtle) {
        throw new Error("Web Crypto API not available");
      }
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    get subtle() {
      return typeof crypto !== "undefined" ? crypto.subtle : void 0;
    }
  };
  function createBrowserAdapters() {
    return {
      http: new BrowserHttpClient(),
      storage: new ChromeStorageAdapter(),
      crypto: new BrowserCryptoAdapter(),
      logger: new ConsoleLoggerAdapter(),
      time: new BaseTimeAdapter()
    };
  }

  // node_modules/@popperjs/core/lib/index.js
  var lib_exports = {};
  __export(lib_exports, {
    afterMain: () => afterMain,
    afterRead: () => afterRead,
    afterWrite: () => afterWrite,
    applyStyles: () => applyStyles_default,
    arrow: () => arrow_default,
    auto: () => auto,
    basePlacements: () => basePlacements,
    beforeMain: () => beforeMain,
    beforeRead: () => beforeRead,
    beforeWrite: () => beforeWrite,
    bottom: () => bottom,
    clippingParents: () => clippingParents,
    computeStyles: () => computeStyles_default,
    createPopper: () => createPopper3,
    createPopperBase: () => createPopper,
    createPopperLite: () => createPopper2,
    detectOverflow: () => detectOverflow,
    end: () => end,
    eventListeners: () => eventListeners_default,
    flip: () => flip_default,
    hide: () => hide_default,
    left: () => left,
    main: () => main,
    modifierPhases: () => modifierPhases,
    offset: () => offset_default,
    placements: () => placements,
    popper: () => popper,
    popperGenerator: () => popperGenerator,
    popperOffsets: () => popperOffsets_default,
    preventOverflow: () => preventOverflow_default,
    read: () => read,
    reference: () => reference,
    right: () => right,
    start: () => start,
    top: () => top,
    variationPlacements: () => variationPlacements,
    viewport: () => viewport,
    write: () => write
  });

  // node_modules/@popperjs/core/lib/enums.js
  var top = "top";
  var bottom = "bottom";
  var right = "right";
  var left = "left";
  var auto = "auto";
  var basePlacements = [top, bottom, right, left];
  var start = "start";
  var end = "end";
  var clippingParents = "clippingParents";
  var viewport = "viewport";
  var popper = "popper";
  var reference = "reference";
  var variationPlacements = /* @__PURE__ */ basePlacements.reduce(function(acc, placement) {
    return acc.concat([placement + "-" + start, placement + "-" + end]);
  }, []);
  var placements = /* @__PURE__ */ [].concat(basePlacements, [auto]).reduce(function(acc, placement) {
    return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
  }, []);
  var beforeRead = "beforeRead";
  var read = "read";
  var afterRead = "afterRead";
  var beforeMain = "beforeMain";
  var main = "main";
  var afterMain = "afterMain";
  var beforeWrite = "beforeWrite";
  var write = "write";
  var afterWrite = "afterWrite";
  var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

  // node_modules/@popperjs/core/lib/dom-utils/getNodeName.js
  function getNodeName(element) {
    return element ? (element.nodeName || "").toLowerCase() : null;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getWindow.js
  function getWindow(node) {
    if (node == null) {
      return window;
    }
    if (node.toString() !== "[object Window]") {
      var ownerDocument = node.ownerDocument;
      return ownerDocument ? ownerDocument.defaultView || window : window;
    }
    return node;
  }

  // node_modules/@popperjs/core/lib/dom-utils/instanceOf.js
  function isElement(node) {
    var OwnElement = getWindow(node).Element;
    return node instanceof OwnElement || node instanceof Element;
  }
  function isHTMLElement(node) {
    var OwnElement = getWindow(node).HTMLElement;
    return node instanceof OwnElement || node instanceof HTMLElement;
  }
  function isShadowRoot(node) {
    if (typeof ShadowRoot === "undefined") {
      return false;
    }
    var OwnElement = getWindow(node).ShadowRoot;
    return node instanceof OwnElement || node instanceof ShadowRoot;
  }

  // node_modules/@popperjs/core/lib/modifiers/applyStyles.js
  function applyStyles(_ref) {
    var state = _ref.state;
    Object.keys(state.elements).forEach(function(name) {
      var style = state.styles[name] || {};
      var attributes = state.attributes[name] || {};
      var element = state.elements[name];
      if (!isHTMLElement(element) || !getNodeName(element)) {
        return;
      }
      Object.assign(element.style, style);
      Object.keys(attributes).forEach(function(name2) {
        var value = attributes[name2];
        if (value === false) {
          element.removeAttribute(name2);
        } else {
          element.setAttribute(name2, value === true ? "" : value);
        }
      });
    });
  }
  function effect(_ref2) {
    var state = _ref2.state;
    var initialStyles = {
      popper: {
        position: state.options.strategy,
        left: "0",
        top: "0",
        margin: "0"
      },
      arrow: {
        position: "absolute"
      },
      reference: {}
    };
    Object.assign(state.elements.popper.style, initialStyles.popper);
    state.styles = initialStyles;
    if (state.elements.arrow) {
      Object.assign(state.elements.arrow.style, initialStyles.arrow);
    }
    return function() {
      Object.keys(state.elements).forEach(function(name) {
        var element = state.elements[name];
        var attributes = state.attributes[name] || {};
        var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]);
        var style = styleProperties.reduce(function(style2, property) {
          style2[property] = "";
          return style2;
        }, {});
        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        }
        Object.assign(element.style, style);
        Object.keys(attributes).forEach(function(attribute) {
          element.removeAttribute(attribute);
        });
      });
    };
  }
  var applyStyles_default = {
    name: "applyStyles",
    enabled: true,
    phase: "write",
    fn: applyStyles,
    effect,
    requires: ["computeStyles"]
  };

  // node_modules/@popperjs/core/lib/utils/getBasePlacement.js
  function getBasePlacement(placement) {
    return placement.split("-")[0];
  }

  // node_modules/@popperjs/core/lib/utils/math.js
  var max = Math.max;
  var min = Math.min;
  var round = Math.round;

  // node_modules/@popperjs/core/lib/utils/userAgent.js
  function getUAString() {
    var uaData = navigator.userAgentData;
    if (uaData != null && uaData.brands && Array.isArray(uaData.brands)) {
      return uaData.brands.map(function(item) {
        return item.brand + "/" + item.version;
      }).join(" ");
    }
    return navigator.userAgent;
  }

  // node_modules/@popperjs/core/lib/dom-utils/isLayoutViewport.js
  function isLayoutViewport() {
    return !/^((?!chrome|android).)*safari/i.test(getUAString());
  }

  // node_modules/@popperjs/core/lib/dom-utils/getBoundingClientRect.js
  function getBoundingClientRect(element, includeScale, isFixedStrategy) {
    if (includeScale === void 0) {
      includeScale = false;
    }
    if (isFixedStrategy === void 0) {
      isFixedStrategy = false;
    }
    var clientRect = element.getBoundingClientRect();
    var scaleX = 1;
    var scaleY = 1;
    if (includeScale && isHTMLElement(element)) {
      scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
      scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
    }
    var _ref = isElement(element) ? getWindow(element) : window, visualViewport = _ref.visualViewport;
    var addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
    var x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
    var y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
    var width = clientRect.width / scaleX;
    var height = clientRect.height / scaleY;
    return {
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
      x,
      y
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getLayoutRect.js
  function getLayoutRect(element) {
    var clientRect = getBoundingClientRect(element);
    var width = element.offsetWidth;
    var height = element.offsetHeight;
    if (Math.abs(clientRect.width - width) <= 1) {
      width = clientRect.width;
    }
    if (Math.abs(clientRect.height - height) <= 1) {
      height = clientRect.height;
    }
    return {
      x: element.offsetLeft,
      y: element.offsetTop,
      width,
      height
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/contains.js
  function contains(parent, child) {
    var rootNode = child.getRootNode && child.getRootNode();
    if (parent.contains(child)) {
      return true;
    } else if (rootNode && isShadowRoot(rootNode)) {
      var next = child;
      do {
        if (next && parent.isSameNode(next)) {
          return true;
        }
        next = next.parentNode || next.host;
      } while (next);
    }
    return false;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getComputedStyle.js
  function getComputedStyle2(element) {
    return getWindow(element).getComputedStyle(element);
  }

  // node_modules/@popperjs/core/lib/dom-utils/isTableElement.js
  function isTableElement(element) {
    return ["table", "td", "th"].indexOf(getNodeName(element)) >= 0;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getDocumentElement.js
  function getDocumentElement(element) {
    return ((isElement(element) ? element.ownerDocument : (
      // $FlowFixMe[prop-missing]
      element.document
    )) || window.document).documentElement;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getParentNode.js
  function getParentNode(element) {
    if (getNodeName(element) === "html") {
      return element;
    }
    return (
      // this is a quicker (but less type safe) way to save quite some bytes from the bundle
      // $FlowFixMe[incompatible-return]
      // $FlowFixMe[prop-missing]
      element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
      element.parentNode || // DOM Element detected
      (isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
      // $FlowFixMe[incompatible-call]: HTMLElement is a Node
      getDocumentElement(element)
    );
  }

  // node_modules/@popperjs/core/lib/dom-utils/getOffsetParent.js
  function getTrueOffsetParent(element) {
    if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
    getComputedStyle2(element).position === "fixed") {
      return null;
    }
    return element.offsetParent;
  }
  function getContainingBlock(element) {
    var isFirefox = /firefox/i.test(getUAString());
    var isIE = /Trident/i.test(getUAString());
    if (isIE && isHTMLElement(element)) {
      var elementCss = getComputedStyle2(element);
      if (elementCss.position === "fixed") {
        return null;
      }
    }
    var currentNode = getParentNode(element);
    if (isShadowRoot(currentNode)) {
      currentNode = currentNode.host;
    }
    while (isHTMLElement(currentNode) && ["html", "body"].indexOf(getNodeName(currentNode)) < 0) {
      var css = getComputedStyle2(currentNode);
      if (css.transform !== "none" || css.perspective !== "none" || css.contain === "paint" || ["transform", "perspective"].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === "filter" || isFirefox && css.filter && css.filter !== "none") {
        return currentNode;
      } else {
        currentNode = currentNode.parentNode;
      }
    }
    return null;
  }
  function getOffsetParent(element) {
    var window2 = getWindow(element);
    var offsetParent = getTrueOffsetParent(element);
    while (offsetParent && isTableElement(offsetParent) && getComputedStyle2(offsetParent).position === "static") {
      offsetParent = getTrueOffsetParent(offsetParent);
    }
    if (offsetParent && (getNodeName(offsetParent) === "html" || getNodeName(offsetParent) === "body" && getComputedStyle2(offsetParent).position === "static")) {
      return window2;
    }
    return offsetParent || getContainingBlock(element) || window2;
  }

  // node_modules/@popperjs/core/lib/utils/getMainAxisFromPlacement.js
  function getMainAxisFromPlacement(placement) {
    return ["top", "bottom"].indexOf(placement) >= 0 ? "x" : "y";
  }

  // node_modules/@popperjs/core/lib/utils/within.js
  function within(min2, value, max2) {
    return max(min2, min(value, max2));
  }
  function withinMaxClamp(min2, value, max2) {
    var v = within(min2, value, max2);
    return v > max2 ? max2 : v;
  }

  // node_modules/@popperjs/core/lib/utils/getFreshSideObject.js
  function getFreshSideObject() {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
  }

  // node_modules/@popperjs/core/lib/utils/mergePaddingObject.js
  function mergePaddingObject(paddingObject) {
    return Object.assign({}, getFreshSideObject(), paddingObject);
  }

  // node_modules/@popperjs/core/lib/utils/expandToHashMap.js
  function expandToHashMap(value, keys) {
    return keys.reduce(function(hashMap, key) {
      hashMap[key] = value;
      return hashMap;
    }, {});
  }

  // node_modules/@popperjs/core/lib/modifiers/arrow.js
  var toPaddingObject = function toPaddingObject2(padding, state) {
    padding = typeof padding === "function" ? padding(Object.assign({}, state.rects, {
      placement: state.placement
    })) : padding;
    return mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
  };
  function arrow(_ref) {
    var _state$modifiersData$;
    var state = _ref.state, name = _ref.name, options = _ref.options;
    var arrowElement = state.elements.arrow;
    var popperOffsets2 = state.modifiersData.popperOffsets;
    var basePlacement = getBasePlacement(state.placement);
    var axis = getMainAxisFromPlacement(basePlacement);
    var isVertical = [left, right].indexOf(basePlacement) >= 0;
    var len = isVertical ? "height" : "width";
    if (!arrowElement || !popperOffsets2) {
      return;
    }
    var paddingObject = toPaddingObject(options.padding, state);
    var arrowRect = getLayoutRect(arrowElement);
    var minProp = axis === "y" ? top : left;
    var maxProp = axis === "y" ? bottom : right;
    var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets2[axis] - state.rects.popper[len];
    var startDiff = popperOffsets2[axis] - state.rects.reference[axis];
    var arrowOffsetParent = getOffsetParent(arrowElement);
    var clientSize = arrowOffsetParent ? axis === "y" ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
    var centerToReference = endDiff / 2 - startDiff / 2;
    var min2 = paddingObject[minProp];
    var max2 = clientSize - arrowRect[len] - paddingObject[maxProp];
    var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
    var offset2 = within(min2, center, max2);
    var axisProp = axis;
    state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset2, _state$modifiersData$.centerOffset = offset2 - center, _state$modifiersData$);
  }
  function effect2(_ref2) {
    var state = _ref2.state, options = _ref2.options;
    var _options$element = options.element, arrowElement = _options$element === void 0 ? "[data-popper-arrow]" : _options$element;
    if (arrowElement == null) {
      return;
    }
    if (typeof arrowElement === "string") {
      arrowElement = state.elements.popper.querySelector(arrowElement);
      if (!arrowElement) {
        return;
      }
    }
    if (!contains(state.elements.popper, arrowElement)) {
      return;
    }
    state.elements.arrow = arrowElement;
  }
  var arrow_default = {
    name: "arrow",
    enabled: true,
    phase: "main",
    fn: arrow,
    effect: effect2,
    requires: ["popperOffsets"],
    requiresIfExists: ["preventOverflow"]
  };

  // node_modules/@popperjs/core/lib/utils/getVariation.js
  function getVariation(placement) {
    return placement.split("-")[1];
  }

  // node_modules/@popperjs/core/lib/modifiers/computeStyles.js
  var unsetSides = {
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto"
  };
  function roundOffsetsByDPR(_ref, win) {
    var x = _ref.x, y = _ref.y;
    var dpr = win.devicePixelRatio || 1;
    return {
      x: round(x * dpr) / dpr || 0,
      y: round(y * dpr) / dpr || 0
    };
  }
  function mapToStyles(_ref2) {
    var _Object$assign2;
    var popper2 = _ref2.popper, popperRect = _ref2.popperRect, placement = _ref2.placement, variation = _ref2.variation, offsets = _ref2.offsets, position = _ref2.position, gpuAcceleration = _ref2.gpuAcceleration, adaptive = _ref2.adaptive, roundOffsets = _ref2.roundOffsets, isFixed = _ref2.isFixed;
    var _offsets$x = offsets.x, x = _offsets$x === void 0 ? 0 : _offsets$x, _offsets$y = offsets.y, y = _offsets$y === void 0 ? 0 : _offsets$y;
    var _ref3 = typeof roundOffsets === "function" ? roundOffsets({
      x,
      y
    }) : {
      x,
      y
    };
    x = _ref3.x;
    y = _ref3.y;
    var hasX = offsets.hasOwnProperty("x");
    var hasY = offsets.hasOwnProperty("y");
    var sideX = left;
    var sideY = top;
    var win = window;
    if (adaptive) {
      var offsetParent = getOffsetParent(popper2);
      var heightProp = "clientHeight";
      var widthProp = "clientWidth";
      if (offsetParent === getWindow(popper2)) {
        offsetParent = getDocumentElement(popper2);
        if (getComputedStyle2(offsetParent).position !== "static" && position === "absolute") {
          heightProp = "scrollHeight";
          widthProp = "scrollWidth";
        }
      }
      offsetParent = offsetParent;
      if (placement === top || (placement === left || placement === right) && variation === end) {
        sideY = bottom;
        var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : (
          // $FlowFixMe[prop-missing]
          offsetParent[heightProp]
        );
        y -= offsetY - popperRect.height;
        y *= gpuAcceleration ? 1 : -1;
      }
      if (placement === left || (placement === top || placement === bottom) && variation === end) {
        sideX = right;
        var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : (
          // $FlowFixMe[prop-missing]
          offsetParent[widthProp]
        );
        x -= offsetX - popperRect.width;
        x *= gpuAcceleration ? 1 : -1;
      }
    }
    var commonStyles = Object.assign({
      position
    }, adaptive && unsetSides);
    var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
      x,
      y
    }, getWindow(popper2)) : {
      x,
      y
    };
    x = _ref4.x;
    y = _ref4.y;
    if (gpuAcceleration) {
      var _Object$assign;
      return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? "0" : "", _Object$assign[sideX] = hasX ? "0" : "", _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
    }
    return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : "", _Object$assign2[sideX] = hasX ? x + "px" : "", _Object$assign2.transform = "", _Object$assign2));
  }
  function computeStyles(_ref5) {
    var state = _ref5.state, options = _ref5.options;
    var _options$gpuAccelerat = options.gpuAcceleration, gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat, _options$adaptive = options.adaptive, adaptive = _options$adaptive === void 0 ? true : _options$adaptive, _options$roundOffsets = options.roundOffsets, roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;
    var commonStyles = {
      placement: getBasePlacement(state.placement),
      variation: getVariation(state.placement),
      popper: state.elements.popper,
      popperRect: state.rects.popper,
      gpuAcceleration,
      isFixed: state.options.strategy === "fixed"
    };
    if (state.modifiersData.popperOffsets != null) {
      state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
        offsets: state.modifiersData.popperOffsets,
        position: state.options.strategy,
        adaptive,
        roundOffsets
      })));
    }
    if (state.modifiersData.arrow != null) {
      state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
        offsets: state.modifiersData.arrow,
        position: "absolute",
        adaptive: false,
        roundOffsets
      })));
    }
    state.attributes.popper = Object.assign({}, state.attributes.popper, {
      "data-popper-placement": state.placement
    });
  }
  var computeStyles_default = {
    name: "computeStyles",
    enabled: true,
    phase: "beforeWrite",
    fn: computeStyles,
    data: {}
  };

  // node_modules/@popperjs/core/lib/modifiers/eventListeners.js
  var passive = {
    passive: true
  };
  function effect3(_ref) {
    var state = _ref.state, instance = _ref.instance, options = _ref.options;
    var _options$scroll = options.scroll, scroll = _options$scroll === void 0 ? true : _options$scroll, _options$resize = options.resize, resize = _options$resize === void 0 ? true : _options$resize;
    var window2 = getWindow(state.elements.popper);
    var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);
    if (scroll) {
      scrollParents.forEach(function(scrollParent) {
        scrollParent.addEventListener("scroll", instance.update, passive);
      });
    }
    if (resize) {
      window2.addEventListener("resize", instance.update, passive);
    }
    return function() {
      if (scroll) {
        scrollParents.forEach(function(scrollParent) {
          scrollParent.removeEventListener("scroll", instance.update, passive);
        });
      }
      if (resize) {
        window2.removeEventListener("resize", instance.update, passive);
      }
    };
  }
  var eventListeners_default = {
    name: "eventListeners",
    enabled: true,
    phase: "write",
    fn: function fn() {
    },
    effect: effect3,
    data: {}
  };

  // node_modules/@popperjs/core/lib/utils/getOppositePlacement.js
  var hash = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom"
  };
  function getOppositePlacement(placement) {
    return placement.replace(/left|right|bottom|top/g, function(matched) {
      return hash[matched];
    });
  }

  // node_modules/@popperjs/core/lib/utils/getOppositeVariationPlacement.js
  var hash2 = {
    start: "end",
    end: "start"
  };
  function getOppositeVariationPlacement(placement) {
    return placement.replace(/start|end/g, function(matched) {
      return hash2[matched];
    });
  }

  // node_modules/@popperjs/core/lib/dom-utils/getWindowScroll.js
  function getWindowScroll(node) {
    var win = getWindow(node);
    var scrollLeft = win.pageXOffset;
    var scrollTop = win.pageYOffset;
    return {
      scrollLeft,
      scrollTop
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getWindowScrollBarX.js
  function getWindowScrollBarX(element) {
    return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
  }

  // node_modules/@popperjs/core/lib/dom-utils/getViewportRect.js
  function getViewportRect(element, strategy) {
    var win = getWindow(element);
    var html = getDocumentElement(element);
    var visualViewport = win.visualViewport;
    var width = html.clientWidth;
    var height = html.clientHeight;
    var x = 0;
    var y = 0;
    if (visualViewport) {
      width = visualViewport.width;
      height = visualViewport.height;
      var layoutViewport = isLayoutViewport();
      if (layoutViewport || !layoutViewport && strategy === "fixed") {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }
    return {
      width,
      height,
      x: x + getWindowScrollBarX(element),
      y
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getDocumentRect.js
  function getDocumentRect(element) {
    var _element$ownerDocumen;
    var html = getDocumentElement(element);
    var winScroll = getWindowScroll(element);
    var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
    var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
    var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
    var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
    var y = -winScroll.scrollTop;
    if (getComputedStyle2(body || html).direction === "rtl") {
      x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
    }
    return {
      width,
      height,
      x,
      y
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/isScrollParent.js
  function isScrollParent(element) {
    var _getComputedStyle = getComputedStyle2(element), overflow = _getComputedStyle.overflow, overflowX = _getComputedStyle.overflowX, overflowY = _getComputedStyle.overflowY;
    return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
  }

  // node_modules/@popperjs/core/lib/dom-utils/getScrollParent.js
  function getScrollParent(node) {
    if (["html", "body", "#document"].indexOf(getNodeName(node)) >= 0) {
      return node.ownerDocument.body;
    }
    if (isHTMLElement(node) && isScrollParent(node)) {
      return node;
    }
    return getScrollParent(getParentNode(node));
  }

  // node_modules/@popperjs/core/lib/dom-utils/listScrollParents.js
  function listScrollParents(element, list) {
    var _element$ownerDocumen;
    if (list === void 0) {
      list = [];
    }
    var scrollParent = getScrollParent(element);
    var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
    var win = getWindow(scrollParent);
    var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
    var updatedList = list.concat(target);
    return isBody ? updatedList : (
      // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
      updatedList.concat(listScrollParents(getParentNode(target)))
    );
  }

  // node_modules/@popperjs/core/lib/utils/rectToClientRect.js
  function rectToClientRect(rect) {
    return Object.assign({}, rect, {
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height
    });
  }

  // node_modules/@popperjs/core/lib/dom-utils/getClippingRect.js
  function getInnerBoundingClientRect(element, strategy) {
    var rect = getBoundingClientRect(element, false, strategy === "fixed");
    rect.top = rect.top + element.clientTop;
    rect.left = rect.left + element.clientLeft;
    rect.bottom = rect.top + element.clientHeight;
    rect.right = rect.left + element.clientWidth;
    rect.width = element.clientWidth;
    rect.height = element.clientHeight;
    rect.x = rect.left;
    rect.y = rect.top;
    return rect;
  }
  function getClientRectFromMixedType(element, clippingParent, strategy) {
    return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
  }
  function getClippingParents(element) {
    var clippingParents2 = listScrollParents(getParentNode(element));
    var canEscapeClipping = ["absolute", "fixed"].indexOf(getComputedStyle2(element).position) >= 0;
    var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;
    if (!isElement(clipperElement)) {
      return [];
    }
    return clippingParents2.filter(function(clippingParent) {
      return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== "body";
    });
  }
  function getClippingRect(element, boundary, rootBoundary, strategy) {
    var mainClippingParents = boundary === "clippingParents" ? getClippingParents(element) : [].concat(boundary);
    var clippingParents2 = [].concat(mainClippingParents, [rootBoundary]);
    var firstClippingParent = clippingParents2[0];
    var clippingRect = clippingParents2.reduce(function(accRect, clippingParent) {
      var rect = getClientRectFromMixedType(element, clippingParent, strategy);
      accRect.top = max(rect.top, accRect.top);
      accRect.right = min(rect.right, accRect.right);
      accRect.bottom = min(rect.bottom, accRect.bottom);
      accRect.left = max(rect.left, accRect.left);
      return accRect;
    }, getClientRectFromMixedType(element, firstClippingParent, strategy));
    clippingRect.width = clippingRect.right - clippingRect.left;
    clippingRect.height = clippingRect.bottom - clippingRect.top;
    clippingRect.x = clippingRect.left;
    clippingRect.y = clippingRect.top;
    return clippingRect;
  }

  // node_modules/@popperjs/core/lib/utils/computeOffsets.js
  function computeOffsets(_ref) {
    var reference2 = _ref.reference, element = _ref.element, placement = _ref.placement;
    var basePlacement = placement ? getBasePlacement(placement) : null;
    var variation = placement ? getVariation(placement) : null;
    var commonX = reference2.x + reference2.width / 2 - element.width / 2;
    var commonY = reference2.y + reference2.height / 2 - element.height / 2;
    var offsets;
    switch (basePlacement) {
      case top:
        offsets = {
          x: commonX,
          y: reference2.y - element.height
        };
        break;
      case bottom:
        offsets = {
          x: commonX,
          y: reference2.y + reference2.height
        };
        break;
      case right:
        offsets = {
          x: reference2.x + reference2.width,
          y: commonY
        };
        break;
      case left:
        offsets = {
          x: reference2.x - element.width,
          y: commonY
        };
        break;
      default:
        offsets = {
          x: reference2.x,
          y: reference2.y
        };
    }
    var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;
    if (mainAxis != null) {
      var len = mainAxis === "y" ? "height" : "width";
      switch (variation) {
        case start:
          offsets[mainAxis] = offsets[mainAxis] - (reference2[len] / 2 - element[len] / 2);
          break;
        case end:
          offsets[mainAxis] = offsets[mainAxis] + (reference2[len] / 2 - element[len] / 2);
          break;
        default:
      }
    }
    return offsets;
  }

  // node_modules/@popperjs/core/lib/utils/detectOverflow.js
  function detectOverflow(state, options) {
    if (options === void 0) {
      options = {};
    }
    var _options = options, _options$placement = _options.placement, placement = _options$placement === void 0 ? state.placement : _options$placement, _options$strategy = _options.strategy, strategy = _options$strategy === void 0 ? state.strategy : _options$strategy, _options$boundary = _options.boundary, boundary = _options$boundary === void 0 ? clippingParents : _options$boundary, _options$rootBoundary = _options.rootBoundary, rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary, _options$elementConte = _options.elementContext, elementContext = _options$elementConte === void 0 ? popper : _options$elementConte, _options$altBoundary = _options.altBoundary, altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary, _options$padding = _options.padding, padding = _options$padding === void 0 ? 0 : _options$padding;
    var paddingObject = mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
    var altContext = elementContext === popper ? reference : popper;
    var popperRect = state.rects.popper;
    var element = state.elements[altBoundary ? altContext : elementContext];
    var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy);
    var referenceClientRect = getBoundingClientRect(state.elements.reference);
    var popperOffsets2 = computeOffsets({
      reference: referenceClientRect,
      element: popperRect,
      strategy: "absolute",
      placement
    });
    var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets2));
    var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect;
    var overflowOffsets = {
      top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
      bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
      left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
      right: elementClientRect.right - clippingClientRect.right + paddingObject.right
    };
    var offsetData = state.modifiersData.offset;
    if (elementContext === popper && offsetData) {
      var offset2 = offsetData[placement];
      Object.keys(overflowOffsets).forEach(function(key) {
        var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
        var axis = [top, bottom].indexOf(key) >= 0 ? "y" : "x";
        overflowOffsets[key] += offset2[axis] * multiply;
      });
    }
    return overflowOffsets;
  }

  // node_modules/@popperjs/core/lib/utils/computeAutoPlacement.js
  function computeAutoPlacement(state, options) {
    if (options === void 0) {
      options = {};
    }
    var _options = options, placement = _options.placement, boundary = _options.boundary, rootBoundary = _options.rootBoundary, padding = _options.padding, flipVariations = _options.flipVariations, _options$allowedAutoP = _options.allowedAutoPlacements, allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
    var variation = getVariation(placement);
    var placements2 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function(placement2) {
      return getVariation(placement2) === variation;
    }) : basePlacements;
    var allowedPlacements = placements2.filter(function(placement2) {
      return allowedAutoPlacements.indexOf(placement2) >= 0;
    });
    if (allowedPlacements.length === 0) {
      allowedPlacements = placements2;
    }
    var overflows = allowedPlacements.reduce(function(acc, placement2) {
      acc[placement2] = detectOverflow(state, {
        placement: placement2,
        boundary,
        rootBoundary,
        padding
      })[getBasePlacement(placement2)];
      return acc;
    }, {});
    return Object.keys(overflows).sort(function(a, b) {
      return overflows[a] - overflows[b];
    });
  }

  // node_modules/@popperjs/core/lib/modifiers/flip.js
  function getExpandedFallbackPlacements(placement) {
    if (getBasePlacement(placement) === auto) {
      return [];
    }
    var oppositePlacement = getOppositePlacement(placement);
    return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
  }
  function flip(_ref) {
    var state = _ref.state, options = _ref.options, name = _ref.name;
    if (state.modifiersData[name]._skip) {
      return;
    }
    var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis, specifiedFallbackPlacements = options.fallbackPlacements, padding = options.padding, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, _options$flipVariatio = options.flipVariations, flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio, allowedAutoPlacements = options.allowedAutoPlacements;
    var preferredPlacement = state.options.placement;
    var basePlacement = getBasePlacement(preferredPlacement);
    var isBasePlacement = basePlacement === preferredPlacement;
    var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
    var placements2 = [preferredPlacement].concat(fallbackPlacements).reduce(function(acc, placement2) {
      return acc.concat(getBasePlacement(placement2) === auto ? computeAutoPlacement(state, {
        placement: placement2,
        boundary,
        rootBoundary,
        padding,
        flipVariations,
        allowedAutoPlacements
      }) : placement2);
    }, []);
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var checksMap = /* @__PURE__ */ new Map();
    var makeFallbackChecks = true;
    var firstFittingPlacement = placements2[0];
    for (var i = 0; i < placements2.length; i++) {
      var placement = placements2[i];
      var _basePlacement = getBasePlacement(placement);
      var isStartVariation = getVariation(placement) === start;
      var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
      var len = isVertical ? "width" : "height";
      var overflow = detectOverflow(state, {
        placement,
        boundary,
        rootBoundary,
        altBoundary,
        padding
      });
      var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;
      if (referenceRect[len] > popperRect[len]) {
        mainVariationSide = getOppositePlacement(mainVariationSide);
      }
      var altVariationSide = getOppositePlacement(mainVariationSide);
      var checks = [];
      if (checkMainAxis) {
        checks.push(overflow[_basePlacement] <= 0);
      }
      if (checkAltAxis) {
        checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
      }
      if (checks.every(function(check) {
        return check;
      })) {
        firstFittingPlacement = placement;
        makeFallbackChecks = false;
        break;
      }
      checksMap.set(placement, checks);
    }
    if (makeFallbackChecks) {
      var numberOfChecks = flipVariations ? 3 : 1;
      var _loop = function _loop2(_i2) {
        var fittingPlacement = placements2.find(function(placement2) {
          var checks2 = checksMap.get(placement2);
          if (checks2) {
            return checks2.slice(0, _i2).every(function(check) {
              return check;
            });
          }
        });
        if (fittingPlacement) {
          firstFittingPlacement = fittingPlacement;
          return "break";
        }
      };
      for (var _i = numberOfChecks; _i > 0; _i--) {
        var _ret = _loop(_i);
        if (_ret === "break")
          break;
      }
    }
    if (state.placement !== firstFittingPlacement) {
      state.modifiersData[name]._skip = true;
      state.placement = firstFittingPlacement;
      state.reset = true;
    }
  }
  var flip_default = {
    name: "flip",
    enabled: true,
    phase: "main",
    fn: flip,
    requiresIfExists: ["offset"],
    data: {
      _skip: false
    }
  };

  // node_modules/@popperjs/core/lib/modifiers/hide.js
  function getSideOffsets(overflow, rect, preventedOffsets) {
    if (preventedOffsets === void 0) {
      preventedOffsets = {
        x: 0,
        y: 0
      };
    }
    return {
      top: overflow.top - rect.height - preventedOffsets.y,
      right: overflow.right - rect.width + preventedOffsets.x,
      bottom: overflow.bottom - rect.height + preventedOffsets.y,
      left: overflow.left - rect.width - preventedOffsets.x
    };
  }
  function isAnySideFullyClipped(overflow) {
    return [top, right, bottom, left].some(function(side) {
      return overflow[side] >= 0;
    });
  }
  function hide(_ref) {
    var state = _ref.state, name = _ref.name;
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var preventedOffsets = state.modifiersData.preventOverflow;
    var referenceOverflow = detectOverflow(state, {
      elementContext: "reference"
    });
    var popperAltOverflow = detectOverflow(state, {
      altBoundary: true
    });
    var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
    var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
    var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
    var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
    state.modifiersData[name] = {
      referenceClippingOffsets,
      popperEscapeOffsets,
      isReferenceHidden,
      hasPopperEscaped
    };
    state.attributes.popper = Object.assign({}, state.attributes.popper, {
      "data-popper-reference-hidden": isReferenceHidden,
      "data-popper-escaped": hasPopperEscaped
    });
  }
  var hide_default = {
    name: "hide",
    enabled: true,
    phase: "main",
    requiresIfExists: ["preventOverflow"],
    fn: hide
  };

  // node_modules/@popperjs/core/lib/modifiers/offset.js
  function distanceAndSkiddingToXY(placement, rects, offset2) {
    var basePlacement = getBasePlacement(placement);
    var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;
    var _ref = typeof offset2 === "function" ? offset2(Object.assign({}, rects, {
      placement
    })) : offset2, skidding = _ref[0], distance = _ref[1];
    skidding = skidding || 0;
    distance = (distance || 0) * invertDistance;
    return [left, right].indexOf(basePlacement) >= 0 ? {
      x: distance,
      y: skidding
    } : {
      x: skidding,
      y: distance
    };
  }
  function offset(_ref2) {
    var state = _ref2.state, options = _ref2.options, name = _ref2.name;
    var _options$offset = options.offset, offset2 = _options$offset === void 0 ? [0, 0] : _options$offset;
    var data = placements.reduce(function(acc, placement) {
      acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset2);
      return acc;
    }, {});
    var _data$state$placement = data[state.placement], x = _data$state$placement.x, y = _data$state$placement.y;
    if (state.modifiersData.popperOffsets != null) {
      state.modifiersData.popperOffsets.x += x;
      state.modifiersData.popperOffsets.y += y;
    }
    state.modifiersData[name] = data;
  }
  var offset_default = {
    name: "offset",
    enabled: true,
    phase: "main",
    requires: ["popperOffsets"],
    fn: offset
  };

  // node_modules/@popperjs/core/lib/modifiers/popperOffsets.js
  function popperOffsets(_ref) {
    var state = _ref.state, name = _ref.name;
    state.modifiersData[name] = computeOffsets({
      reference: state.rects.reference,
      element: state.rects.popper,
      strategy: "absolute",
      placement: state.placement
    });
  }
  var popperOffsets_default = {
    name: "popperOffsets",
    enabled: true,
    phase: "read",
    fn: popperOffsets,
    data: {}
  };

  // node_modules/@popperjs/core/lib/utils/getAltAxis.js
  function getAltAxis(axis) {
    return axis === "x" ? "y" : "x";
  }

  // node_modules/@popperjs/core/lib/modifiers/preventOverflow.js
  function preventOverflow(_ref) {
    var state = _ref.state, options = _ref.options, name = _ref.name;
    var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, padding = options.padding, _options$tether = options.tether, tether = _options$tether === void 0 ? true : _options$tether, _options$tetherOffset = options.tetherOffset, tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
    var overflow = detectOverflow(state, {
      boundary,
      rootBoundary,
      padding,
      altBoundary
    });
    var basePlacement = getBasePlacement(state.placement);
    var variation = getVariation(state.placement);
    var isBasePlacement = !variation;
    var mainAxis = getMainAxisFromPlacement(basePlacement);
    var altAxis = getAltAxis(mainAxis);
    var popperOffsets2 = state.modifiersData.popperOffsets;
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var tetherOffsetValue = typeof tetherOffset === "function" ? tetherOffset(Object.assign({}, state.rects, {
      placement: state.placement
    })) : tetherOffset;
    var normalizedTetherOffsetValue = typeof tetherOffsetValue === "number" ? {
      mainAxis: tetherOffsetValue,
      altAxis: tetherOffsetValue
    } : Object.assign({
      mainAxis: 0,
      altAxis: 0
    }, tetherOffsetValue);
    var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
    var data = {
      x: 0,
      y: 0
    };
    if (!popperOffsets2) {
      return;
    }
    if (checkMainAxis) {
      var _offsetModifierState$;
      var mainSide = mainAxis === "y" ? top : left;
      var altSide = mainAxis === "y" ? bottom : right;
      var len = mainAxis === "y" ? "height" : "width";
      var offset2 = popperOffsets2[mainAxis];
      var min2 = offset2 + overflow[mainSide];
      var max2 = offset2 - overflow[altSide];
      var additive = tether ? -popperRect[len] / 2 : 0;
      var minLen = variation === start ? referenceRect[len] : popperRect[len];
      var maxLen = variation === start ? -popperRect[len] : -referenceRect[len];
      var arrowElement = state.elements.arrow;
      var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
        width: 0,
        height: 0
      };
      var arrowPaddingObject = state.modifiersData["arrow#persistent"] ? state.modifiersData["arrow#persistent"].padding : getFreshSideObject();
      var arrowPaddingMin = arrowPaddingObject[mainSide];
      var arrowPaddingMax = arrowPaddingObject[altSide];
      var arrowLen = within(0, referenceRect[len], arrowRect[len]);
      var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
      var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
      var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
      var clientOffset = arrowOffsetParent ? mainAxis === "y" ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
      var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
      var tetherMin = offset2 + minOffset - offsetModifierValue - clientOffset;
      var tetherMax = offset2 + maxOffset - offsetModifierValue;
      var preventedOffset = within(tether ? min(min2, tetherMin) : min2, offset2, tether ? max(max2, tetherMax) : max2);
      popperOffsets2[mainAxis] = preventedOffset;
      data[mainAxis] = preventedOffset - offset2;
    }
    if (checkAltAxis) {
      var _offsetModifierState$2;
      var _mainSide = mainAxis === "x" ? top : left;
      var _altSide = mainAxis === "x" ? bottom : right;
      var _offset = popperOffsets2[altAxis];
      var _len = altAxis === "y" ? "height" : "width";
      var _min = _offset + overflow[_mainSide];
      var _max = _offset - overflow[_altSide];
      var isOriginSide = [top, left].indexOf(basePlacement) !== -1;
      var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;
      var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;
      var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;
      var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);
      popperOffsets2[altAxis] = _preventedOffset;
      data[altAxis] = _preventedOffset - _offset;
    }
    state.modifiersData[name] = data;
  }
  var preventOverflow_default = {
    name: "preventOverflow",
    enabled: true,
    phase: "main",
    fn: preventOverflow,
    requiresIfExists: ["offset"]
  };

  // node_modules/@popperjs/core/lib/dom-utils/getHTMLElementScroll.js
  function getHTMLElementScroll(element) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }

  // node_modules/@popperjs/core/lib/dom-utils/getNodeScroll.js
  function getNodeScroll(node) {
    if (node === getWindow(node) || !isHTMLElement(node)) {
      return getWindowScroll(node);
    } else {
      return getHTMLElementScroll(node);
    }
  }

  // node_modules/@popperjs/core/lib/dom-utils/getCompositeRect.js
  function isElementScaled(element) {
    var rect = element.getBoundingClientRect();
    var scaleX = round(rect.width) / element.offsetWidth || 1;
    var scaleY = round(rect.height) / element.offsetHeight || 1;
    return scaleX !== 1 || scaleY !== 1;
  }
  function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
    if (isFixed === void 0) {
      isFixed = false;
    }
    var isOffsetParentAnElement = isHTMLElement(offsetParent);
    var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
    var documentElement = getDocumentElement(offsetParent);
    var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
    var scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    var offsets = {
      x: 0,
      y: 0
    };
    if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
      if (getNodeName(offsetParent) !== "body" || // https://github.com/popperjs/popper-core/issues/1078
      isScrollParent(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isHTMLElement(offsetParent)) {
        offsets = getBoundingClientRect(offsetParent, true);
        offsets.x += offsetParent.clientLeft;
        offsets.y += offsetParent.clientTop;
      } else if (documentElement) {
        offsets.x = getWindowScrollBarX(documentElement);
      }
    }
    return {
      x: rect.left + scroll.scrollLeft - offsets.x,
      y: rect.top + scroll.scrollTop - offsets.y,
      width: rect.width,
      height: rect.height
    };
  }

  // node_modules/@popperjs/core/lib/utils/orderModifiers.js
  function order(modifiers) {
    var map = /* @__PURE__ */ new Map();
    var visited = /* @__PURE__ */ new Set();
    var result = [];
    modifiers.forEach(function(modifier) {
      map.set(modifier.name, modifier);
    });
    function sort(modifier) {
      visited.add(modifier.name);
      var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
      requires.forEach(function(dep) {
        if (!visited.has(dep)) {
          var depModifier = map.get(dep);
          if (depModifier) {
            sort(depModifier);
          }
        }
      });
      result.push(modifier);
    }
    modifiers.forEach(function(modifier) {
      if (!visited.has(modifier.name)) {
        sort(modifier);
      }
    });
    return result;
  }
  function orderModifiers(modifiers) {
    var orderedModifiers = order(modifiers);
    return modifierPhases.reduce(function(acc, phase) {
      return acc.concat(orderedModifiers.filter(function(modifier) {
        return modifier.phase === phase;
      }));
    }, []);
  }

  // node_modules/@popperjs/core/lib/utils/debounce.js
  function debounce(fn2) {
    var pending;
    return function() {
      if (!pending) {
        pending = new Promise(function(resolve) {
          Promise.resolve().then(function() {
            pending = void 0;
            resolve(fn2());
          });
        });
      }
      return pending;
    };
  }

  // node_modules/@popperjs/core/lib/utils/mergeByName.js
  function mergeByName(modifiers) {
    var merged = modifiers.reduce(function(merged2, current) {
      var existing = merged2[current.name];
      merged2[current.name] = existing ? Object.assign({}, existing, current, {
        options: Object.assign({}, existing.options, current.options),
        data: Object.assign({}, existing.data, current.data)
      }) : current;
      return merged2;
    }, {});
    return Object.keys(merged).map(function(key) {
      return merged[key];
    });
  }

  // node_modules/@popperjs/core/lib/createPopper.js
  var DEFAULT_OPTIONS = {
    placement: "bottom",
    modifiers: [],
    strategy: "absolute"
  };
  function areValidElements() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return !args.some(function(element) {
      return !(element && typeof element.getBoundingClientRect === "function");
    });
  }
  function popperGenerator(generatorOptions) {
    if (generatorOptions === void 0) {
      generatorOptions = {};
    }
    var _generatorOptions = generatorOptions, _generatorOptions$def = _generatorOptions.defaultModifiers, defaultModifiers3 = _generatorOptions$def === void 0 ? [] : _generatorOptions$def, _generatorOptions$def2 = _generatorOptions.defaultOptions, defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
    return function createPopper4(reference2, popper2, options) {
      if (options === void 0) {
        options = defaultOptions;
      }
      var state = {
        placement: "bottom",
        orderedModifiers: [],
        options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
        modifiersData: {},
        elements: {
          reference: reference2,
          popper: popper2
        },
        attributes: {},
        styles: {}
      };
      var effectCleanupFns = [];
      var isDestroyed = false;
      var instance = {
        state,
        setOptions: function setOptions(setOptionsAction) {
          var options2 = typeof setOptionsAction === "function" ? setOptionsAction(state.options) : setOptionsAction;
          cleanupModifierEffects();
          state.options = Object.assign({}, defaultOptions, state.options, options2);
          state.scrollParents = {
            reference: isElement(reference2) ? listScrollParents(reference2) : reference2.contextElement ? listScrollParents(reference2.contextElement) : [],
            popper: listScrollParents(popper2)
          };
          var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers3, state.options.modifiers)));
          state.orderedModifiers = orderedModifiers.filter(function(m) {
            return m.enabled;
          });
          runModifierEffects();
          return instance.update();
        },
        // Sync update – it will always be executed, even if not necessary. This
        // is useful for low frequency updates where sync behavior simplifies the
        // logic.
        // For high frequency updates (e.g. `resize` and `scroll` events), always
        // prefer the async Popper#update method
        forceUpdate: function forceUpdate() {
          if (isDestroyed) {
            return;
          }
          var _state$elements = state.elements, reference3 = _state$elements.reference, popper3 = _state$elements.popper;
          if (!areValidElements(reference3, popper3)) {
            return;
          }
          state.rects = {
            reference: getCompositeRect(reference3, getOffsetParent(popper3), state.options.strategy === "fixed"),
            popper: getLayoutRect(popper3)
          };
          state.reset = false;
          state.placement = state.options.placement;
          state.orderedModifiers.forEach(function(modifier) {
            return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
          });
          for (var index = 0; index < state.orderedModifiers.length; index++) {
            if (state.reset === true) {
              state.reset = false;
              index = -1;
              continue;
            }
            var _state$orderedModifie = state.orderedModifiers[index], fn2 = _state$orderedModifie.fn, _state$orderedModifie2 = _state$orderedModifie.options, _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2, name = _state$orderedModifie.name;
            if (typeof fn2 === "function") {
              state = fn2({
                state,
                options: _options,
                name,
                instance
              }) || state;
            }
          }
        },
        // Async and optimistically optimized update – it will not be executed if
        // not necessary (debounced to run at most once-per-tick)
        update: debounce(function() {
          return new Promise(function(resolve) {
            instance.forceUpdate();
            resolve(state);
          });
        }),
        destroy: function destroy() {
          cleanupModifierEffects();
          isDestroyed = true;
        }
      };
      if (!areValidElements(reference2, popper2)) {
        return instance;
      }
      instance.setOptions(options).then(function(state2) {
        if (!isDestroyed && options.onFirstUpdate) {
          options.onFirstUpdate(state2);
        }
      });
      function runModifierEffects() {
        state.orderedModifiers.forEach(function(_ref) {
          var name = _ref.name, _ref$options = _ref.options, options2 = _ref$options === void 0 ? {} : _ref$options, effect4 = _ref.effect;
          if (typeof effect4 === "function") {
            var cleanupFn = effect4({
              state,
              name,
              instance,
              options: options2
            });
            var noopFn = function noopFn2() {
            };
            effectCleanupFns.push(cleanupFn || noopFn);
          }
        });
      }
      function cleanupModifierEffects() {
        effectCleanupFns.forEach(function(fn2) {
          return fn2();
        });
        effectCleanupFns = [];
      }
      return instance;
    };
  }
  var createPopper = /* @__PURE__ */ popperGenerator();

  // node_modules/@popperjs/core/lib/popper-lite.js
  var defaultModifiers = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default];
  var createPopper2 = /* @__PURE__ */ popperGenerator({
    defaultModifiers
  });

  // node_modules/@popperjs/core/lib/popper.js
  var defaultModifiers2 = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default, offset_default, flip_default, preventOverflow_default, arrow_default, hide_default];
  var createPopper3 = /* @__PURE__ */ popperGenerator({
    defaultModifiers: defaultModifiers2
  });

  // node_modules/bootstrap/dist/js/bootstrap.esm.js
  var elementMap = /* @__PURE__ */ new Map();
  var Data = {
    set(element, key, instance) {
      if (!elementMap.has(element)) {
        elementMap.set(element, /* @__PURE__ */ new Map());
      }
      const instanceMap = elementMap.get(element);
      if (!instanceMap.has(key) && instanceMap.size !== 0) {
        console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(instanceMap.keys())[0]}.`);
        return;
      }
      instanceMap.set(key, instance);
    },
    get(element, key) {
      if (elementMap.has(element)) {
        return elementMap.get(element).get(key) || null;
      }
      return null;
    },
    remove(element, key) {
      if (!elementMap.has(element)) {
        return;
      }
      const instanceMap = elementMap.get(element);
      instanceMap.delete(key);
      if (instanceMap.size === 0) {
        elementMap.delete(element);
      }
    }
  };
  var MAX_UID = 1e6;
  var MILLISECONDS_MULTIPLIER = 1e3;
  var TRANSITION_END = "transitionend";
  var parseSelector = (selector) => {
    if (selector && window.CSS && window.CSS.escape) {
      selector = selector.replace(/#([^\s"#']+)/g, (match, id) => `#${CSS.escape(id)}`);
    }
    return selector;
  };
  var toType = (object) => {
    if (object === null || object === void 0) {
      return `${object}`;
    }
    return Object.prototype.toString.call(object).match(/\s([a-z]+)/i)[1].toLowerCase();
  };
  var getUID = (prefix) => {
    do {
      prefix += Math.floor(Math.random() * MAX_UID);
    } while (document.getElementById(prefix));
    return prefix;
  };
  var getTransitionDurationFromElement = (element) => {
    if (!element) {
      return 0;
    }
    let {
      transitionDuration,
      transitionDelay
    } = window.getComputedStyle(element);
    const floatTransitionDuration = Number.parseFloat(transitionDuration);
    const floatTransitionDelay = Number.parseFloat(transitionDelay);
    if (!floatTransitionDuration && !floatTransitionDelay) {
      return 0;
    }
    transitionDuration = transitionDuration.split(",")[0];
    transitionDelay = transitionDelay.split(",")[0];
    return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
  };
  var triggerTransitionEnd = (element) => {
    element.dispatchEvent(new Event(TRANSITION_END));
  };
  var isElement2 = (object) => {
    if (!object || typeof object !== "object") {
      return false;
    }
    if (typeof object.jquery !== "undefined") {
      object = object[0];
    }
    return typeof object.nodeType !== "undefined";
  };
  var getElement = (object) => {
    if (isElement2(object)) {
      return object.jquery ? object[0] : object;
    }
    if (typeof object === "string" && object.length > 0) {
      return document.querySelector(parseSelector(object));
    }
    return null;
  };
  var isVisible = (element) => {
    if (!isElement2(element) || element.getClientRects().length === 0) {
      return false;
    }
    const elementIsVisible = getComputedStyle(element).getPropertyValue("visibility") === "visible";
    const closedDetails = element.closest("details:not([open])");
    if (!closedDetails) {
      return elementIsVisible;
    }
    if (closedDetails !== element) {
      const summary = element.closest("summary");
      if (summary && summary.parentNode !== closedDetails) {
        return false;
      }
      if (summary === null) {
        return false;
      }
    }
    return elementIsVisible;
  };
  var isDisabled = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }
    if (element.classList.contains("disabled")) {
      return true;
    }
    if (typeof element.disabled !== "undefined") {
      return element.disabled;
    }
    return element.hasAttribute("disabled") && element.getAttribute("disabled") !== "false";
  };
  var findShadowRoot = (element) => {
    if (!document.documentElement.attachShadow) {
      return null;
    }
    if (typeof element.getRootNode === "function") {
      const root = element.getRootNode();
      return root instanceof ShadowRoot ? root : null;
    }
    if (element instanceof ShadowRoot) {
      return element;
    }
    if (!element.parentNode) {
      return null;
    }
    return findShadowRoot(element.parentNode);
  };
  var noop = () => {
  };
  var reflow = (element) => {
    element.offsetHeight;
  };
  var getjQuery = () => {
    if (window.jQuery && !document.body.hasAttribute("data-bs-no-jquery")) {
      return window.jQuery;
    }
    return null;
  };
  var DOMContentLoadedCallbacks = [];
  var onDOMContentLoaded = (callback) => {
    if (document.readyState === "loading") {
      if (!DOMContentLoadedCallbacks.length) {
        document.addEventListener("DOMContentLoaded", () => {
          for (const callback2 of DOMContentLoadedCallbacks) {
            callback2();
          }
        });
      }
      DOMContentLoadedCallbacks.push(callback);
    } else {
      callback();
    }
  };
  var isRTL = () => document.documentElement.dir === "rtl";
  var defineJQueryPlugin = (plugin) => {
    onDOMContentLoaded(() => {
      const $ = getjQuery();
      if ($) {
        const name = plugin.NAME;
        const JQUERY_NO_CONFLICT = $.fn[name];
        $.fn[name] = plugin.jQueryInterface;
        $.fn[name].Constructor = plugin;
        $.fn[name].noConflict = () => {
          $.fn[name] = JQUERY_NO_CONFLICT;
          return plugin.jQueryInterface;
        };
      }
    });
  };
  var execute = (possibleCallback, args = [], defaultValue = possibleCallback) => {
    return typeof possibleCallback === "function" ? possibleCallback.call(...args) : defaultValue;
  };
  var executeAfterTransition = (callback, transitionElement, waitForTransition = true) => {
    if (!waitForTransition) {
      execute(callback);
      return;
    }
    const durationPadding = 5;
    const emulatedDuration = getTransitionDurationFromElement(transitionElement) + durationPadding;
    let called = false;
    const handler = ({
      target
    }) => {
      if (target !== transitionElement) {
        return;
      }
      called = true;
      transitionElement.removeEventListener(TRANSITION_END, handler);
      execute(callback);
    };
    transitionElement.addEventListener(TRANSITION_END, handler);
    setTimeout(() => {
      if (!called) {
        triggerTransitionEnd(transitionElement);
      }
    }, emulatedDuration);
  };
  var getNextActiveElement = (list, activeElement, shouldGetNext, isCycleAllowed) => {
    const listLength = list.length;
    let index = list.indexOf(activeElement);
    if (index === -1) {
      return !shouldGetNext && isCycleAllowed ? list[listLength - 1] : list[0];
    }
    index += shouldGetNext ? 1 : -1;
    if (isCycleAllowed) {
      index = (index + listLength) % listLength;
    }
    return list[Math.max(0, Math.min(index, listLength - 1))];
  };
  var namespaceRegex = /[^.]*(?=\..*)\.|.*/;
  var stripNameRegex = /\..*/;
  var stripUidRegex = /::\d+$/;
  var eventRegistry = {};
  var uidEvent = 1;
  var customEvents = {
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  };
  var nativeEvents = /* @__PURE__ */ new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientationchange", "touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointerleave", "pointercancel", "gesturestart", "gesturechange", "gestureend", "focus", "blur", "change", "reset", "select", "submit", "focusin", "focusout", "load", "unload", "beforeunload", "resize", "move", "DOMContentLoaded", "readystatechange", "error", "abort", "scroll"]);
  function makeEventUid(element, uid) {
    return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++;
  }
  function getElementEvents(element) {
    const uid = makeEventUid(element);
    element.uidEvent = uid;
    eventRegistry[uid] = eventRegistry[uid] || {};
    return eventRegistry[uid];
  }
  function bootstrapHandler(element, fn2) {
    return function handler(event) {
      hydrateObj(event, {
        delegateTarget: element
      });
      if (handler.oneOff) {
        EventHandler.off(element, event.type, fn2);
      }
      return fn2.apply(element, [event]);
    };
  }
  function bootstrapDelegationHandler(element, selector, fn2) {
    return function handler(event) {
      const domElements = element.querySelectorAll(selector);
      for (let {
        target
      } = event; target && target !== this; target = target.parentNode) {
        for (const domElement of domElements) {
          if (domElement !== target) {
            continue;
          }
          hydrateObj(event, {
            delegateTarget: target
          });
          if (handler.oneOff) {
            EventHandler.off(element, event.type, selector, fn2);
          }
          return fn2.apply(target, [event]);
        }
      }
    };
  }
  function findHandler(events, callable, delegationSelector = null) {
    return Object.values(events).find((event) => event.callable === callable && event.delegationSelector === delegationSelector);
  }
  function normalizeParameters(originalTypeEvent, handler, delegationFunction) {
    const isDelegated = typeof handler === "string";
    const callable = isDelegated ? delegationFunction : handler || delegationFunction;
    let typeEvent = getTypeEvent(originalTypeEvent);
    if (!nativeEvents.has(typeEvent)) {
      typeEvent = originalTypeEvent;
    }
    return [isDelegated, callable, typeEvent];
  }
  function addHandler(element, originalTypeEvent, handler, delegationFunction, oneOff) {
    if (typeof originalTypeEvent !== "string" || !element) {
      return;
    }
    let [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction);
    if (originalTypeEvent in customEvents) {
      const wrapFunction = (fn3) => {
        return function(event) {
          if (!event.relatedTarget || event.relatedTarget !== event.delegateTarget && !event.delegateTarget.contains(event.relatedTarget)) {
            return fn3.call(this, event);
          }
        };
      };
      callable = wrapFunction(callable);
    }
    const events = getElementEvents(element);
    const handlers = events[typeEvent] || (events[typeEvent] = {});
    const previousFunction = findHandler(handlers, callable, isDelegated ? handler : null);
    if (previousFunction) {
      previousFunction.oneOff = previousFunction.oneOff && oneOff;
      return;
    }
    const uid = makeEventUid(callable, originalTypeEvent.replace(namespaceRegex, ""));
    const fn2 = isDelegated ? bootstrapDelegationHandler(element, handler, callable) : bootstrapHandler(element, callable);
    fn2.delegationSelector = isDelegated ? handler : null;
    fn2.callable = callable;
    fn2.oneOff = oneOff;
    fn2.uidEvent = uid;
    handlers[uid] = fn2;
    element.addEventListener(typeEvent, fn2, isDelegated);
  }
  function removeHandler(element, events, typeEvent, handler, delegationSelector) {
    const fn2 = findHandler(events[typeEvent], handler, delegationSelector);
    if (!fn2) {
      return;
    }
    element.removeEventListener(typeEvent, fn2, Boolean(delegationSelector));
    delete events[typeEvent][fn2.uidEvent];
  }
  function removeNamespacedHandlers(element, events, typeEvent, namespace) {
    const storeElementEvent = events[typeEvent] || {};
    for (const [handlerKey, event] of Object.entries(storeElementEvent)) {
      if (handlerKey.includes(namespace)) {
        removeHandler(element, events, typeEvent, event.callable, event.delegationSelector);
      }
    }
  }
  function getTypeEvent(event) {
    event = event.replace(stripNameRegex, "");
    return customEvents[event] || event;
  }
  var EventHandler = {
    on(element, event, handler, delegationFunction) {
      addHandler(element, event, handler, delegationFunction, false);
    },
    one(element, event, handler, delegationFunction) {
      addHandler(element, event, handler, delegationFunction, true);
    },
    off(element, originalTypeEvent, handler, delegationFunction) {
      if (typeof originalTypeEvent !== "string" || !element) {
        return;
      }
      const [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction);
      const inNamespace = typeEvent !== originalTypeEvent;
      const events = getElementEvents(element);
      const storeElementEvent = events[typeEvent] || {};
      const isNamespace = originalTypeEvent.startsWith(".");
      if (typeof callable !== "undefined") {
        if (!Object.keys(storeElementEvent).length) {
          return;
        }
        removeHandler(element, events, typeEvent, callable, isDelegated ? handler : null);
        return;
      }
      if (isNamespace) {
        for (const elementEvent of Object.keys(events)) {
          removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
        }
      }
      for (const [keyHandlers, event] of Object.entries(storeElementEvent)) {
        const handlerKey = keyHandlers.replace(stripUidRegex, "");
        if (!inNamespace || originalTypeEvent.includes(handlerKey)) {
          removeHandler(element, events, typeEvent, event.callable, event.delegationSelector);
        }
      }
    },
    trigger(element, event, args) {
      if (typeof event !== "string" || !element) {
        return null;
      }
      const $ = getjQuery();
      const typeEvent = getTypeEvent(event);
      const inNamespace = event !== typeEvent;
      let jQueryEvent = null;
      let bubbles = true;
      let nativeDispatch = true;
      let defaultPrevented = false;
      if (inNamespace && $) {
        jQueryEvent = $.Event(event, args);
        $(element).trigger(jQueryEvent);
        bubbles = !jQueryEvent.isPropagationStopped();
        nativeDispatch = !jQueryEvent.isImmediatePropagationStopped();
        defaultPrevented = jQueryEvent.isDefaultPrevented();
      }
      const evt = hydrateObj(new Event(event, {
        bubbles,
        cancelable: true
      }), args);
      if (defaultPrevented) {
        evt.preventDefault();
      }
      if (nativeDispatch) {
        element.dispatchEvent(evt);
      }
      if (evt.defaultPrevented && jQueryEvent) {
        jQueryEvent.preventDefault();
      }
      return evt;
    }
  };
  function hydrateObj(obj, meta = {}) {
    for (const [key, value] of Object.entries(meta)) {
      try {
        obj[key] = value;
      } catch (_unused) {
        Object.defineProperty(obj, key, {
          configurable: true,
          get() {
            return value;
          }
        });
      }
    }
    return obj;
  }
  function normalizeData(value) {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    if (value === Number(value).toString()) {
      return Number(value);
    }
    if (value === "" || value === "null") {
      return null;
    }
    if (typeof value !== "string") {
      return value;
    }
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (_unused) {
      return value;
    }
  }
  function normalizeDataKey(key) {
    return key.replace(/[A-Z]/g, (chr) => `-${chr.toLowerCase()}`);
  }
  var Manipulator = {
    setDataAttribute(element, key, value) {
      element.setAttribute(`data-bs-${normalizeDataKey(key)}`, value);
    },
    removeDataAttribute(element, key) {
      element.removeAttribute(`data-bs-${normalizeDataKey(key)}`);
    },
    getDataAttributes(element) {
      if (!element) {
        return {};
      }
      const attributes = {};
      const bsKeys = Object.keys(element.dataset).filter((key) => key.startsWith("bs") && !key.startsWith("bsConfig"));
      for (const key of bsKeys) {
        let pureKey = key.replace(/^bs/, "");
        pureKey = pureKey.charAt(0).toLowerCase() + pureKey.slice(1);
        attributes[pureKey] = normalizeData(element.dataset[key]);
      }
      return attributes;
    },
    getDataAttribute(element, key) {
      return normalizeData(element.getAttribute(`data-bs-${normalizeDataKey(key)}`));
    }
  };
  var Config = class {
    // Getters
    static get Default() {
      return {};
    }
    static get DefaultType() {
      return {};
    }
    static get NAME() {
      throw new Error('You have to implement the static method "NAME", for each component!');
    }
    _getConfig(config) {
      config = this._mergeConfigObj(config);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }
    _configAfterMerge(config) {
      return config;
    }
    _mergeConfigObj(config, element) {
      const jsonConfig = isElement2(element) ? Manipulator.getDataAttribute(element, "config") : {};
      return {
        ...this.constructor.Default,
        ...typeof jsonConfig === "object" ? jsonConfig : {},
        ...isElement2(element) ? Manipulator.getDataAttributes(element) : {},
        ...typeof config === "object" ? config : {}
      };
    }
    _typeCheckConfig(config, configTypes = this.constructor.DefaultType) {
      for (const [property, expectedTypes] of Object.entries(configTypes)) {
        const value = config[property];
        const valueType = isElement2(value) ? "element" : toType(value);
        if (!new RegExp(expectedTypes).test(valueType)) {
          throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${property}" provided type "${valueType}" but expected type "${expectedTypes}".`);
        }
      }
    }
  };
  var VERSION = "5.3.7";
  var BaseComponent = class extends Config {
    constructor(element, config) {
      super();
      element = getElement(element);
      if (!element) {
        return;
      }
      this._element = element;
      this._config = this._getConfig(config);
      Data.set(this._element, this.constructor.DATA_KEY, this);
    }
    // Public
    dispose() {
      Data.remove(this._element, this.constructor.DATA_KEY);
      EventHandler.off(this._element, this.constructor.EVENT_KEY);
      for (const propertyName of Object.getOwnPropertyNames(this)) {
        this[propertyName] = null;
      }
    }
    // Private
    _queueCallback(callback, element, isAnimated = true) {
      executeAfterTransition(callback, element, isAnimated);
    }
    _getConfig(config) {
      config = this._mergeConfigObj(config, this._element);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }
    // Static
    static getInstance(element) {
      return Data.get(getElement(element), this.DATA_KEY);
    }
    static getOrCreateInstance(element, config = {}) {
      return this.getInstance(element) || new this(element, typeof config === "object" ? config : null);
    }
    static get VERSION() {
      return VERSION;
    }
    static get DATA_KEY() {
      return `bs.${this.NAME}`;
    }
    static get EVENT_KEY() {
      return `.${this.DATA_KEY}`;
    }
    static eventName(name) {
      return `${name}${this.EVENT_KEY}`;
    }
  };
  var getSelector = (element) => {
    let selector = element.getAttribute("data-bs-target");
    if (!selector || selector === "#") {
      let hrefAttribute = element.getAttribute("href");
      if (!hrefAttribute || !hrefAttribute.includes("#") && !hrefAttribute.startsWith(".")) {
        return null;
      }
      if (hrefAttribute.includes("#") && !hrefAttribute.startsWith("#")) {
        hrefAttribute = `#${hrefAttribute.split("#")[1]}`;
      }
      selector = hrefAttribute && hrefAttribute !== "#" ? hrefAttribute.trim() : null;
    }
    return selector ? selector.split(",").map((sel) => parseSelector(sel)).join(",") : null;
  };
  var SelectorEngine = {
    find(selector, element = document.documentElement) {
      return [].concat(...Element.prototype.querySelectorAll.call(element, selector));
    },
    findOne(selector, element = document.documentElement) {
      return Element.prototype.querySelector.call(element, selector);
    },
    children(element, selector) {
      return [].concat(...element.children).filter((child) => child.matches(selector));
    },
    parents(element, selector) {
      const parents = [];
      let ancestor = element.parentNode.closest(selector);
      while (ancestor) {
        parents.push(ancestor);
        ancestor = ancestor.parentNode.closest(selector);
      }
      return parents;
    },
    prev(element, selector) {
      let previous = element.previousElementSibling;
      while (previous) {
        if (previous.matches(selector)) {
          return [previous];
        }
        previous = previous.previousElementSibling;
      }
      return [];
    },
    // TODO: this is now unused; remove later along with prev()
    next(element, selector) {
      let next = element.nextElementSibling;
      while (next) {
        if (next.matches(selector)) {
          return [next];
        }
        next = next.nextElementSibling;
      }
      return [];
    },
    focusableChildren(element) {
      const focusables = ["a", "button", "input", "textarea", "select", "details", "[tabindex]", '[contenteditable="true"]'].map((selector) => `${selector}:not([tabindex^="-"])`).join(",");
      return this.find(focusables, element).filter((el) => !isDisabled(el) && isVisible(el));
    },
    getSelectorFromElement(element) {
      const selector = getSelector(element);
      if (selector) {
        return SelectorEngine.findOne(selector) ? selector : null;
      }
      return null;
    },
    getElementFromSelector(element) {
      const selector = getSelector(element);
      return selector ? SelectorEngine.findOne(selector) : null;
    },
    getMultipleElementsFromSelector(element) {
      const selector = getSelector(element);
      return selector ? SelectorEngine.find(selector) : [];
    }
  };
  var enableDismissTrigger = (component, method = "hide") => {
    const clickEvent = `click.dismiss${component.EVENT_KEY}`;
    const name = component.NAME;
    EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, function(event) {
      if (["A", "AREA"].includes(this.tagName)) {
        event.preventDefault();
      }
      if (isDisabled(this)) {
        return;
      }
      const target = SelectorEngine.getElementFromSelector(this) || this.closest(`.${name}`);
      const instance = component.getOrCreateInstance(target);
      instance[method]();
    });
  };
  var NAME$f = "alert";
  var DATA_KEY$a = "bs.alert";
  var EVENT_KEY$b = `.${DATA_KEY$a}`;
  var EVENT_CLOSE = `close${EVENT_KEY$b}`;
  var EVENT_CLOSED = `closed${EVENT_KEY$b}`;
  var CLASS_NAME_FADE$5 = "fade";
  var CLASS_NAME_SHOW$8 = "show";
  var Alert = class _Alert extends BaseComponent {
    // Getters
    static get NAME() {
      return NAME$f;
    }
    // Public
    close() {
      const closeEvent = EventHandler.trigger(this._element, EVENT_CLOSE);
      if (closeEvent.defaultPrevented) {
        return;
      }
      this._element.classList.remove(CLASS_NAME_SHOW$8);
      const isAnimated = this._element.classList.contains(CLASS_NAME_FADE$5);
      this._queueCallback(() => this._destroyElement(), this._element, isAnimated);
    }
    // Private
    _destroyElement() {
      this._element.remove();
      EventHandler.trigger(this._element, EVENT_CLOSED);
      this.dispose();
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Alert.getOrCreateInstance(this);
        if (typeof config !== "string") {
          return;
        }
        if (data[config] === void 0 || config.startsWith("_") || config === "constructor") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config](this);
      });
    }
  };
  enableDismissTrigger(Alert, "close");
  defineJQueryPlugin(Alert);
  var NAME$e = "button";
  var DATA_KEY$9 = "bs.button";
  var EVENT_KEY$a = `.${DATA_KEY$9}`;
  var DATA_API_KEY$6 = ".data-api";
  var CLASS_NAME_ACTIVE$3 = "active";
  var SELECTOR_DATA_TOGGLE$5 = '[data-bs-toggle="button"]';
  var EVENT_CLICK_DATA_API$6 = `click${EVENT_KEY$a}${DATA_API_KEY$6}`;
  var Button = class _Button extends BaseComponent {
    // Getters
    static get NAME() {
      return NAME$e;
    }
    // Public
    toggle() {
      this._element.setAttribute("aria-pressed", this._element.classList.toggle(CLASS_NAME_ACTIVE$3));
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Button.getOrCreateInstance(this);
        if (config === "toggle") {
          data[config]();
        }
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$6, SELECTOR_DATA_TOGGLE$5, (event) => {
    event.preventDefault();
    const button = event.target.closest(SELECTOR_DATA_TOGGLE$5);
    const data = Button.getOrCreateInstance(button);
    data.toggle();
  });
  defineJQueryPlugin(Button);
  var NAME$d = "swipe";
  var EVENT_KEY$9 = ".bs.swipe";
  var EVENT_TOUCHSTART = `touchstart${EVENT_KEY$9}`;
  var EVENT_TOUCHMOVE = `touchmove${EVENT_KEY$9}`;
  var EVENT_TOUCHEND = `touchend${EVENT_KEY$9}`;
  var EVENT_POINTERDOWN = `pointerdown${EVENT_KEY$9}`;
  var EVENT_POINTERUP = `pointerup${EVENT_KEY$9}`;
  var POINTER_TYPE_TOUCH = "touch";
  var POINTER_TYPE_PEN = "pen";
  var CLASS_NAME_POINTER_EVENT = "pointer-event";
  var SWIPE_THRESHOLD = 40;
  var Default$c = {
    endCallback: null,
    leftCallback: null,
    rightCallback: null
  };
  var DefaultType$c = {
    endCallback: "(function|null)",
    leftCallback: "(function|null)",
    rightCallback: "(function|null)"
  };
  var Swipe = class _Swipe extends Config {
    constructor(element, config) {
      super();
      this._element = element;
      if (!element || !_Swipe.isSupported()) {
        return;
      }
      this._config = this._getConfig(config);
      this._deltaX = 0;
      this._supportPointerEvents = Boolean(window.PointerEvent);
      this._initEvents();
    }
    // Getters
    static get Default() {
      return Default$c;
    }
    static get DefaultType() {
      return DefaultType$c;
    }
    static get NAME() {
      return NAME$d;
    }
    // Public
    dispose() {
      EventHandler.off(this._element, EVENT_KEY$9);
    }
    // Private
    _start(event) {
      if (!this._supportPointerEvents) {
        this._deltaX = event.touches[0].clientX;
        return;
      }
      if (this._eventIsPointerPenTouch(event)) {
        this._deltaX = event.clientX;
      }
    }
    _end(event) {
      if (this._eventIsPointerPenTouch(event)) {
        this._deltaX = event.clientX - this._deltaX;
      }
      this._handleSwipe();
      execute(this._config.endCallback);
    }
    _move(event) {
      this._deltaX = event.touches && event.touches.length > 1 ? 0 : event.touches[0].clientX - this._deltaX;
    }
    _handleSwipe() {
      const absDeltaX = Math.abs(this._deltaX);
      if (absDeltaX <= SWIPE_THRESHOLD) {
        return;
      }
      const direction = absDeltaX / this._deltaX;
      this._deltaX = 0;
      if (!direction) {
        return;
      }
      execute(direction > 0 ? this._config.rightCallback : this._config.leftCallback);
    }
    _initEvents() {
      if (this._supportPointerEvents) {
        EventHandler.on(this._element, EVENT_POINTERDOWN, (event) => this._start(event));
        EventHandler.on(this._element, EVENT_POINTERUP, (event) => this._end(event));
        this._element.classList.add(CLASS_NAME_POINTER_EVENT);
      } else {
        EventHandler.on(this._element, EVENT_TOUCHSTART, (event) => this._start(event));
        EventHandler.on(this._element, EVENT_TOUCHMOVE, (event) => this._move(event));
        EventHandler.on(this._element, EVENT_TOUCHEND, (event) => this._end(event));
      }
    }
    _eventIsPointerPenTouch(event) {
      return this._supportPointerEvents && (event.pointerType === POINTER_TYPE_PEN || event.pointerType === POINTER_TYPE_TOUCH);
    }
    // Static
    static isSupported() {
      return "ontouchstart" in document.documentElement || navigator.maxTouchPoints > 0;
    }
  };
  var NAME$c = "carousel";
  var DATA_KEY$8 = "bs.carousel";
  var EVENT_KEY$8 = `.${DATA_KEY$8}`;
  var DATA_API_KEY$5 = ".data-api";
  var ARROW_LEFT_KEY$1 = "ArrowLeft";
  var ARROW_RIGHT_KEY$1 = "ArrowRight";
  var TOUCHEVENT_COMPAT_WAIT = 500;
  var ORDER_NEXT = "next";
  var ORDER_PREV = "prev";
  var DIRECTION_LEFT = "left";
  var DIRECTION_RIGHT = "right";
  var EVENT_SLIDE = `slide${EVENT_KEY$8}`;
  var EVENT_SLID = `slid${EVENT_KEY$8}`;
  var EVENT_KEYDOWN$1 = `keydown${EVENT_KEY$8}`;
  var EVENT_MOUSEENTER$1 = `mouseenter${EVENT_KEY$8}`;
  var EVENT_MOUSELEAVE$1 = `mouseleave${EVENT_KEY$8}`;
  var EVENT_DRAG_START = `dragstart${EVENT_KEY$8}`;
  var EVENT_LOAD_DATA_API$3 = `load${EVENT_KEY$8}${DATA_API_KEY$5}`;
  var EVENT_CLICK_DATA_API$5 = `click${EVENT_KEY$8}${DATA_API_KEY$5}`;
  var CLASS_NAME_CAROUSEL = "carousel";
  var CLASS_NAME_ACTIVE$2 = "active";
  var CLASS_NAME_SLIDE = "slide";
  var CLASS_NAME_END = "carousel-item-end";
  var CLASS_NAME_START = "carousel-item-start";
  var CLASS_NAME_NEXT = "carousel-item-next";
  var CLASS_NAME_PREV = "carousel-item-prev";
  var SELECTOR_ACTIVE = ".active";
  var SELECTOR_ITEM = ".carousel-item";
  var SELECTOR_ACTIVE_ITEM = SELECTOR_ACTIVE + SELECTOR_ITEM;
  var SELECTOR_ITEM_IMG = ".carousel-item img";
  var SELECTOR_INDICATORS = ".carousel-indicators";
  var SELECTOR_DATA_SLIDE = "[data-bs-slide], [data-bs-slide-to]";
  var SELECTOR_DATA_RIDE = '[data-bs-ride="carousel"]';
  var KEY_TO_DIRECTION = {
    [ARROW_LEFT_KEY$1]: DIRECTION_RIGHT,
    [ARROW_RIGHT_KEY$1]: DIRECTION_LEFT
  };
  var Default$b = {
    interval: 5e3,
    keyboard: true,
    pause: "hover",
    ride: false,
    touch: true,
    wrap: true
  };
  var DefaultType$b = {
    interval: "(number|boolean)",
    // TODO:v6 remove boolean support
    keyboard: "boolean",
    pause: "(string|boolean)",
    ride: "(boolean|string)",
    touch: "boolean",
    wrap: "boolean"
  };
  var Carousel = class _Carousel extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._interval = null;
      this._activeElement = null;
      this._isSliding = false;
      this.touchTimeout = null;
      this._swipeHelper = null;
      this._indicatorsElement = SelectorEngine.findOne(SELECTOR_INDICATORS, this._element);
      this._addEventListeners();
      if (this._config.ride === CLASS_NAME_CAROUSEL) {
        this.cycle();
      }
    }
    // Getters
    static get Default() {
      return Default$b;
    }
    static get DefaultType() {
      return DefaultType$b;
    }
    static get NAME() {
      return NAME$c;
    }
    // Public
    next() {
      this._slide(ORDER_NEXT);
    }
    nextWhenVisible() {
      if (!document.hidden && isVisible(this._element)) {
        this.next();
      }
    }
    prev() {
      this._slide(ORDER_PREV);
    }
    pause() {
      if (this._isSliding) {
        triggerTransitionEnd(this._element);
      }
      this._clearInterval();
    }
    cycle() {
      this._clearInterval();
      this._updateInterval();
      this._interval = setInterval(() => this.nextWhenVisible(), this._config.interval);
    }
    _maybeEnableCycle() {
      if (!this._config.ride) {
        return;
      }
      if (this._isSliding) {
        EventHandler.one(this._element, EVENT_SLID, () => this.cycle());
        return;
      }
      this.cycle();
    }
    to(index) {
      const items = this._getItems();
      if (index > items.length - 1 || index < 0) {
        return;
      }
      if (this._isSliding) {
        EventHandler.one(this._element, EVENT_SLID, () => this.to(index));
        return;
      }
      const activeIndex = this._getItemIndex(this._getActive());
      if (activeIndex === index) {
        return;
      }
      const order2 = index > activeIndex ? ORDER_NEXT : ORDER_PREV;
      this._slide(order2, items[index]);
    }
    dispose() {
      if (this._swipeHelper) {
        this._swipeHelper.dispose();
      }
      super.dispose();
    }
    // Private
    _configAfterMerge(config) {
      config.defaultInterval = config.interval;
      return config;
    }
    _addEventListeners() {
      if (this._config.keyboard) {
        EventHandler.on(this._element, EVENT_KEYDOWN$1, (event) => this._keydown(event));
      }
      if (this._config.pause === "hover") {
        EventHandler.on(this._element, EVENT_MOUSEENTER$1, () => this.pause());
        EventHandler.on(this._element, EVENT_MOUSELEAVE$1, () => this._maybeEnableCycle());
      }
      if (this._config.touch && Swipe.isSupported()) {
        this._addTouchEventListeners();
      }
    }
    _addTouchEventListeners() {
      for (const img of SelectorEngine.find(SELECTOR_ITEM_IMG, this._element)) {
        EventHandler.on(img, EVENT_DRAG_START, (event) => event.preventDefault());
      }
      const endCallBack = () => {
        if (this._config.pause !== "hover") {
          return;
        }
        this.pause();
        if (this.touchTimeout) {
          clearTimeout(this.touchTimeout);
        }
        this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), TOUCHEVENT_COMPAT_WAIT + this._config.interval);
      };
      const swipeConfig = {
        leftCallback: () => this._slide(this._directionToOrder(DIRECTION_LEFT)),
        rightCallback: () => this._slide(this._directionToOrder(DIRECTION_RIGHT)),
        endCallback: endCallBack
      };
      this._swipeHelper = new Swipe(this._element, swipeConfig);
    }
    _keydown(event) {
      if (/input|textarea/i.test(event.target.tagName)) {
        return;
      }
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction) {
        event.preventDefault();
        this._slide(this._directionToOrder(direction));
      }
    }
    _getItemIndex(element) {
      return this._getItems().indexOf(element);
    }
    _setActiveIndicatorElement(index) {
      if (!this._indicatorsElement) {
        return;
      }
      const activeIndicator = SelectorEngine.findOne(SELECTOR_ACTIVE, this._indicatorsElement);
      activeIndicator.classList.remove(CLASS_NAME_ACTIVE$2);
      activeIndicator.removeAttribute("aria-current");
      const newActiveIndicator = SelectorEngine.findOne(`[data-bs-slide-to="${index}"]`, this._indicatorsElement);
      if (newActiveIndicator) {
        newActiveIndicator.classList.add(CLASS_NAME_ACTIVE$2);
        newActiveIndicator.setAttribute("aria-current", "true");
      }
    }
    _updateInterval() {
      const element = this._activeElement || this._getActive();
      if (!element) {
        return;
      }
      const elementInterval = Number.parseInt(element.getAttribute("data-bs-interval"), 10);
      this._config.interval = elementInterval || this._config.defaultInterval;
    }
    _slide(order2, element = null) {
      if (this._isSliding) {
        return;
      }
      const activeElement = this._getActive();
      const isNext = order2 === ORDER_NEXT;
      const nextElement = element || getNextActiveElement(this._getItems(), activeElement, isNext, this._config.wrap);
      if (nextElement === activeElement) {
        return;
      }
      const nextElementIndex = this._getItemIndex(nextElement);
      const triggerEvent = (eventName) => {
        return EventHandler.trigger(this._element, eventName, {
          relatedTarget: nextElement,
          direction: this._orderToDirection(order2),
          from: this._getItemIndex(activeElement),
          to: nextElementIndex
        });
      };
      const slideEvent = triggerEvent(EVENT_SLIDE);
      if (slideEvent.defaultPrevented) {
        return;
      }
      if (!activeElement || !nextElement) {
        return;
      }
      const isCycling = Boolean(this._interval);
      this.pause();
      this._isSliding = true;
      this._setActiveIndicatorElement(nextElementIndex);
      this._activeElement = nextElement;
      const directionalClassName = isNext ? CLASS_NAME_START : CLASS_NAME_END;
      const orderClassName = isNext ? CLASS_NAME_NEXT : CLASS_NAME_PREV;
      nextElement.classList.add(orderClassName);
      reflow(nextElement);
      activeElement.classList.add(directionalClassName);
      nextElement.classList.add(directionalClassName);
      const completeCallBack = () => {
        nextElement.classList.remove(directionalClassName, orderClassName);
        nextElement.classList.add(CLASS_NAME_ACTIVE$2);
        activeElement.classList.remove(CLASS_NAME_ACTIVE$2, orderClassName, directionalClassName);
        this._isSliding = false;
        triggerEvent(EVENT_SLID);
      };
      this._queueCallback(completeCallBack, activeElement, this._isAnimated());
      if (isCycling) {
        this.cycle();
      }
    }
    _isAnimated() {
      return this._element.classList.contains(CLASS_NAME_SLIDE);
    }
    _getActive() {
      return SelectorEngine.findOne(SELECTOR_ACTIVE_ITEM, this._element);
    }
    _getItems() {
      return SelectorEngine.find(SELECTOR_ITEM, this._element);
    }
    _clearInterval() {
      if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
      }
    }
    _directionToOrder(direction) {
      if (isRTL()) {
        return direction === DIRECTION_LEFT ? ORDER_PREV : ORDER_NEXT;
      }
      return direction === DIRECTION_LEFT ? ORDER_NEXT : ORDER_PREV;
    }
    _orderToDirection(order2) {
      if (isRTL()) {
        return order2 === ORDER_PREV ? DIRECTION_LEFT : DIRECTION_RIGHT;
      }
      return order2 === ORDER_PREV ? DIRECTION_RIGHT : DIRECTION_LEFT;
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Carousel.getOrCreateInstance(this, config);
        if (typeof config === "number") {
          data.to(config);
          return;
        }
        if (typeof config === "string") {
          if (data[config] === void 0 || config.startsWith("_") || config === "constructor") {
            throw new TypeError(`No method named "${config}"`);
          }
          data[config]();
        }
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$5, SELECTOR_DATA_SLIDE, function(event) {
    const target = SelectorEngine.getElementFromSelector(this);
    if (!target || !target.classList.contains(CLASS_NAME_CAROUSEL)) {
      return;
    }
    event.preventDefault();
    const carousel = Carousel.getOrCreateInstance(target);
    const slideIndex = this.getAttribute("data-bs-slide-to");
    if (slideIndex) {
      carousel.to(slideIndex);
      carousel._maybeEnableCycle();
      return;
    }
    if (Manipulator.getDataAttribute(this, "slide") === "next") {
      carousel.next();
      carousel._maybeEnableCycle();
      return;
    }
    carousel.prev();
    carousel._maybeEnableCycle();
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API$3, () => {
    const carousels = SelectorEngine.find(SELECTOR_DATA_RIDE);
    for (const carousel of carousels) {
      Carousel.getOrCreateInstance(carousel);
    }
  });
  defineJQueryPlugin(Carousel);
  var NAME$b = "collapse";
  var DATA_KEY$7 = "bs.collapse";
  var EVENT_KEY$7 = `.${DATA_KEY$7}`;
  var DATA_API_KEY$4 = ".data-api";
  var EVENT_SHOW$6 = `show${EVENT_KEY$7}`;
  var EVENT_SHOWN$6 = `shown${EVENT_KEY$7}`;
  var EVENT_HIDE$6 = `hide${EVENT_KEY$7}`;
  var EVENT_HIDDEN$6 = `hidden${EVENT_KEY$7}`;
  var EVENT_CLICK_DATA_API$4 = `click${EVENT_KEY$7}${DATA_API_KEY$4}`;
  var CLASS_NAME_SHOW$7 = "show";
  var CLASS_NAME_COLLAPSE = "collapse";
  var CLASS_NAME_COLLAPSING = "collapsing";
  var CLASS_NAME_COLLAPSED = "collapsed";
  var CLASS_NAME_DEEPER_CHILDREN = `:scope .${CLASS_NAME_COLLAPSE} .${CLASS_NAME_COLLAPSE}`;
  var CLASS_NAME_HORIZONTAL = "collapse-horizontal";
  var WIDTH = "width";
  var HEIGHT = "height";
  var SELECTOR_ACTIVES = ".collapse.show, .collapse.collapsing";
  var SELECTOR_DATA_TOGGLE$4 = '[data-bs-toggle="collapse"]';
  var Default$a = {
    parent: null,
    toggle: true
  };
  var DefaultType$a = {
    parent: "(null|element)",
    toggle: "boolean"
  };
  var Collapse = class _Collapse extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._isTransitioning = false;
      this._triggerArray = [];
      const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE$4);
      for (const elem of toggleList) {
        const selector = SelectorEngine.getSelectorFromElement(elem);
        const filterElement = SelectorEngine.find(selector).filter((foundElement) => foundElement === this._element);
        if (selector !== null && filterElement.length) {
          this._triggerArray.push(elem);
        }
      }
      this._initializeChildren();
      if (!this._config.parent) {
        this._addAriaAndCollapsedClass(this._triggerArray, this._isShown());
      }
      if (this._config.toggle) {
        this.toggle();
      }
    }
    // Getters
    static get Default() {
      return Default$a;
    }
    static get DefaultType() {
      return DefaultType$a;
    }
    static get NAME() {
      return NAME$b;
    }
    // Public
    toggle() {
      if (this._isShown()) {
        this.hide();
      } else {
        this.show();
      }
    }
    show() {
      if (this._isTransitioning || this._isShown()) {
        return;
      }
      let activeChildren = [];
      if (this._config.parent) {
        activeChildren = this._getFirstLevelChildren(SELECTOR_ACTIVES).filter((element) => element !== this._element).map((element) => _Collapse.getOrCreateInstance(element, {
          toggle: false
        }));
      }
      if (activeChildren.length && activeChildren[0]._isTransitioning) {
        return;
      }
      const startEvent = EventHandler.trigger(this._element, EVENT_SHOW$6);
      if (startEvent.defaultPrevented) {
        return;
      }
      for (const activeInstance of activeChildren) {
        activeInstance.hide();
      }
      const dimension = this._getDimension();
      this._element.classList.remove(CLASS_NAME_COLLAPSE);
      this._element.classList.add(CLASS_NAME_COLLAPSING);
      this._element.style[dimension] = 0;
      this._addAriaAndCollapsedClass(this._triggerArray, true);
      this._isTransitioning = true;
      const complete = () => {
        this._isTransitioning = false;
        this._element.classList.remove(CLASS_NAME_COLLAPSING);
        this._element.classList.add(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);
        this._element.style[dimension] = "";
        EventHandler.trigger(this._element, EVENT_SHOWN$6);
      };
      const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
      const scrollSize = `scroll${capitalizedDimension}`;
      this._queueCallback(complete, this._element, true);
      this._element.style[dimension] = `${this._element[scrollSize]}px`;
    }
    hide() {
      if (this._isTransitioning || !this._isShown()) {
        return;
      }
      const startEvent = EventHandler.trigger(this._element, EVENT_HIDE$6);
      if (startEvent.defaultPrevented) {
        return;
      }
      const dimension = this._getDimension();
      this._element.style[dimension] = `${this._element.getBoundingClientRect()[dimension]}px`;
      reflow(this._element);
      this._element.classList.add(CLASS_NAME_COLLAPSING);
      this._element.classList.remove(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7);
      for (const trigger of this._triggerArray) {
        const element = SelectorEngine.getElementFromSelector(trigger);
        if (element && !this._isShown(element)) {
          this._addAriaAndCollapsedClass([trigger], false);
        }
      }
      this._isTransitioning = true;
      const complete = () => {
        this._isTransitioning = false;
        this._element.classList.remove(CLASS_NAME_COLLAPSING);
        this._element.classList.add(CLASS_NAME_COLLAPSE);
        EventHandler.trigger(this._element, EVENT_HIDDEN$6);
      };
      this._element.style[dimension] = "";
      this._queueCallback(complete, this._element, true);
    }
    // Private
    _isShown(element = this._element) {
      return element.classList.contains(CLASS_NAME_SHOW$7);
    }
    _configAfterMerge(config) {
      config.toggle = Boolean(config.toggle);
      config.parent = getElement(config.parent);
      return config;
    }
    _getDimension() {
      return this._element.classList.contains(CLASS_NAME_HORIZONTAL) ? WIDTH : HEIGHT;
    }
    _initializeChildren() {
      if (!this._config.parent) {
        return;
      }
      const children = this._getFirstLevelChildren(SELECTOR_DATA_TOGGLE$4);
      for (const element of children) {
        const selected = SelectorEngine.getElementFromSelector(element);
        if (selected) {
          this._addAriaAndCollapsedClass([element], this._isShown(selected));
        }
      }
    }
    _getFirstLevelChildren(selector) {
      const children = SelectorEngine.find(CLASS_NAME_DEEPER_CHILDREN, this._config.parent);
      return SelectorEngine.find(selector, this._config.parent).filter((element) => !children.includes(element));
    }
    _addAriaAndCollapsedClass(triggerArray, isOpen) {
      if (!triggerArray.length) {
        return;
      }
      for (const element of triggerArray) {
        element.classList.toggle(CLASS_NAME_COLLAPSED, !isOpen);
        element.setAttribute("aria-expanded", isOpen);
      }
    }
    // Static
    static jQueryInterface(config) {
      const _config = {};
      if (typeof config === "string" && /show|hide/.test(config)) {
        _config.toggle = false;
      }
      return this.each(function() {
        const data = _Collapse.getOrCreateInstance(this, _config);
        if (typeof config === "string") {
          if (typeof data[config] === "undefined") {
            throw new TypeError(`No method named "${config}"`);
          }
          data[config]();
        }
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$4, SELECTOR_DATA_TOGGLE$4, function(event) {
    if (event.target.tagName === "A" || event.delegateTarget && event.delegateTarget.tagName === "A") {
      event.preventDefault();
    }
    for (const element of SelectorEngine.getMultipleElementsFromSelector(this)) {
      Collapse.getOrCreateInstance(element, {
        toggle: false
      }).toggle();
    }
  });
  defineJQueryPlugin(Collapse);
  var NAME$a = "dropdown";
  var DATA_KEY$6 = "bs.dropdown";
  var EVENT_KEY$6 = `.${DATA_KEY$6}`;
  var DATA_API_KEY$3 = ".data-api";
  var ESCAPE_KEY$2 = "Escape";
  var TAB_KEY$1 = "Tab";
  var ARROW_UP_KEY$1 = "ArrowUp";
  var ARROW_DOWN_KEY$1 = "ArrowDown";
  var RIGHT_MOUSE_BUTTON = 2;
  var EVENT_HIDE$5 = `hide${EVENT_KEY$6}`;
  var EVENT_HIDDEN$5 = `hidden${EVENT_KEY$6}`;
  var EVENT_SHOW$5 = `show${EVENT_KEY$6}`;
  var EVENT_SHOWN$5 = `shown${EVENT_KEY$6}`;
  var EVENT_CLICK_DATA_API$3 = `click${EVENT_KEY$6}${DATA_API_KEY$3}`;
  var EVENT_KEYDOWN_DATA_API = `keydown${EVENT_KEY$6}${DATA_API_KEY$3}`;
  var EVENT_KEYUP_DATA_API = `keyup${EVENT_KEY$6}${DATA_API_KEY$3}`;
  var CLASS_NAME_SHOW$6 = "show";
  var CLASS_NAME_DROPUP = "dropup";
  var CLASS_NAME_DROPEND = "dropend";
  var CLASS_NAME_DROPSTART = "dropstart";
  var CLASS_NAME_DROPUP_CENTER = "dropup-center";
  var CLASS_NAME_DROPDOWN_CENTER = "dropdown-center";
  var SELECTOR_DATA_TOGGLE$3 = '[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)';
  var SELECTOR_DATA_TOGGLE_SHOWN = `${SELECTOR_DATA_TOGGLE$3}.${CLASS_NAME_SHOW$6}`;
  var SELECTOR_MENU = ".dropdown-menu";
  var SELECTOR_NAVBAR = ".navbar";
  var SELECTOR_NAVBAR_NAV = ".navbar-nav";
  var SELECTOR_VISIBLE_ITEMS = ".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)";
  var PLACEMENT_TOP = isRTL() ? "top-end" : "top-start";
  var PLACEMENT_TOPEND = isRTL() ? "top-start" : "top-end";
  var PLACEMENT_BOTTOM = isRTL() ? "bottom-end" : "bottom-start";
  var PLACEMENT_BOTTOMEND = isRTL() ? "bottom-start" : "bottom-end";
  var PLACEMENT_RIGHT = isRTL() ? "left-start" : "right-start";
  var PLACEMENT_LEFT = isRTL() ? "right-start" : "left-start";
  var PLACEMENT_TOPCENTER = "top";
  var PLACEMENT_BOTTOMCENTER = "bottom";
  var Default$9 = {
    autoClose: true,
    boundary: "clippingParents",
    display: "dynamic",
    offset: [0, 2],
    popperConfig: null,
    reference: "toggle"
  };
  var DefaultType$9 = {
    autoClose: "(boolean|string)",
    boundary: "(string|element)",
    display: "string",
    offset: "(array|string|function)",
    popperConfig: "(null|object|function)",
    reference: "(string|element|object)"
  };
  var Dropdown = class _Dropdown extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._popper = null;
      this._parent = this._element.parentNode;
      this._menu = SelectorEngine.next(this._element, SELECTOR_MENU)[0] || SelectorEngine.prev(this._element, SELECTOR_MENU)[0] || SelectorEngine.findOne(SELECTOR_MENU, this._parent);
      this._inNavbar = this._detectNavbar();
    }
    // Getters
    static get Default() {
      return Default$9;
    }
    static get DefaultType() {
      return DefaultType$9;
    }
    static get NAME() {
      return NAME$a;
    }
    // Public
    toggle() {
      return this._isShown() ? this.hide() : this.show();
    }
    show() {
      if (isDisabled(this._element) || this._isShown()) {
        return;
      }
      const relatedTarget = {
        relatedTarget: this._element
      };
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$5, relatedTarget);
      if (showEvent.defaultPrevented) {
        return;
      }
      this._createPopper();
      if ("ontouchstart" in document.documentElement && !this._parent.closest(SELECTOR_NAVBAR_NAV)) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.on(element, "mouseover", noop);
        }
      }
      this._element.focus();
      this._element.setAttribute("aria-expanded", true);
      this._menu.classList.add(CLASS_NAME_SHOW$6);
      this._element.classList.add(CLASS_NAME_SHOW$6);
      EventHandler.trigger(this._element, EVENT_SHOWN$5, relatedTarget);
    }
    hide() {
      if (isDisabled(this._element) || !this._isShown()) {
        return;
      }
      const relatedTarget = {
        relatedTarget: this._element
      };
      this._completeHide(relatedTarget);
    }
    dispose() {
      if (this._popper) {
        this._popper.destroy();
      }
      super.dispose();
    }
    update() {
      this._inNavbar = this._detectNavbar();
      if (this._popper) {
        this._popper.update();
      }
    }
    // Private
    _completeHide(relatedTarget) {
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$5, relatedTarget);
      if (hideEvent.defaultPrevented) {
        return;
      }
      if ("ontouchstart" in document.documentElement) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.off(element, "mouseover", noop);
        }
      }
      if (this._popper) {
        this._popper.destroy();
      }
      this._menu.classList.remove(CLASS_NAME_SHOW$6);
      this._element.classList.remove(CLASS_NAME_SHOW$6);
      this._element.setAttribute("aria-expanded", "false");
      Manipulator.removeDataAttribute(this._menu, "popper");
      EventHandler.trigger(this._element, EVENT_HIDDEN$5, relatedTarget);
      this._element.focus();
    }
    _getConfig(config) {
      config = super._getConfig(config);
      if (typeof config.reference === "object" && !isElement2(config.reference) && typeof config.reference.getBoundingClientRect !== "function") {
        throw new TypeError(`${NAME$a.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
      }
      return config;
    }
    _createPopper() {
      if (typeof lib_exports === "undefined") {
        throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org/docs/v2/)");
      }
      let referenceElement = this._element;
      if (this._config.reference === "parent") {
        referenceElement = this._parent;
      } else if (isElement2(this._config.reference)) {
        referenceElement = getElement(this._config.reference);
      } else if (typeof this._config.reference === "object") {
        referenceElement = this._config.reference;
      }
      const popperConfig = this._getPopperConfig();
      this._popper = createPopper3(referenceElement, this._menu, popperConfig);
    }
    _isShown() {
      return this._menu.classList.contains(CLASS_NAME_SHOW$6);
    }
    _getPlacement() {
      const parentDropdown = this._parent;
      if (parentDropdown.classList.contains(CLASS_NAME_DROPEND)) {
        return PLACEMENT_RIGHT;
      }
      if (parentDropdown.classList.contains(CLASS_NAME_DROPSTART)) {
        return PLACEMENT_LEFT;
      }
      if (parentDropdown.classList.contains(CLASS_NAME_DROPUP_CENTER)) {
        return PLACEMENT_TOPCENTER;
      }
      if (parentDropdown.classList.contains(CLASS_NAME_DROPDOWN_CENTER)) {
        return PLACEMENT_BOTTOMCENTER;
      }
      const isEnd = getComputedStyle(this._menu).getPropertyValue("--bs-position").trim() === "end";
      if (parentDropdown.classList.contains(CLASS_NAME_DROPUP)) {
        return isEnd ? PLACEMENT_TOPEND : PLACEMENT_TOP;
      }
      return isEnd ? PLACEMENT_BOTTOMEND : PLACEMENT_BOTTOM;
    }
    _detectNavbar() {
      return this._element.closest(SELECTOR_NAVBAR) !== null;
    }
    _getOffset() {
      const {
        offset: offset2
      } = this._config;
      if (typeof offset2 === "string") {
        return offset2.split(",").map((value) => Number.parseInt(value, 10));
      }
      if (typeof offset2 === "function") {
        return (popperData) => offset2(popperData, this._element);
      }
      return offset2;
    }
    _getPopperConfig() {
      const defaultBsPopperConfig = {
        placement: this._getPlacement(),
        modifiers: [{
          name: "preventOverflow",
          options: {
            boundary: this._config.boundary
          }
        }, {
          name: "offset",
          options: {
            offset: this._getOffset()
          }
        }]
      };
      if (this._inNavbar || this._config.display === "static") {
        Manipulator.setDataAttribute(this._menu, "popper", "static");
        defaultBsPopperConfig.modifiers = [{
          name: "applyStyles",
          enabled: false
        }];
      }
      return {
        ...defaultBsPopperConfig,
        ...execute(this._config.popperConfig, [void 0, defaultBsPopperConfig])
      };
    }
    _selectMenuItem({
      key,
      target
    }) {
      const items = SelectorEngine.find(SELECTOR_VISIBLE_ITEMS, this._menu).filter((element) => isVisible(element));
      if (!items.length) {
        return;
      }
      getNextActiveElement(items, target, key === ARROW_DOWN_KEY$1, !items.includes(target)).focus();
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Dropdown.getOrCreateInstance(this, config);
        if (typeof config !== "string") {
          return;
        }
        if (typeof data[config] === "undefined") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config]();
      });
    }
    static clearMenus(event) {
      if (event.button === RIGHT_MOUSE_BUTTON || event.type === "keyup" && event.key !== TAB_KEY$1) {
        return;
      }
      const openToggles = SelectorEngine.find(SELECTOR_DATA_TOGGLE_SHOWN);
      for (const toggle of openToggles) {
        const context = _Dropdown.getInstance(toggle);
        if (!context || context._config.autoClose === false) {
          continue;
        }
        const composedPath = event.composedPath();
        const isMenuTarget = composedPath.includes(context._menu);
        if (composedPath.includes(context._element) || context._config.autoClose === "inside" && !isMenuTarget || context._config.autoClose === "outside" && isMenuTarget) {
          continue;
        }
        if (context._menu.contains(event.target) && (event.type === "keyup" && event.key === TAB_KEY$1 || /input|select|option|textarea|form/i.test(event.target.tagName))) {
          continue;
        }
        const relatedTarget = {
          relatedTarget: context._element
        };
        if (event.type === "click") {
          relatedTarget.clickEvent = event;
        }
        context._completeHide(relatedTarget);
      }
    }
    static dataApiKeydownHandler(event) {
      const isInput = /input|textarea/i.test(event.target.tagName);
      const isEscapeEvent = event.key === ESCAPE_KEY$2;
      const isUpOrDownEvent = [ARROW_UP_KEY$1, ARROW_DOWN_KEY$1].includes(event.key);
      if (!isUpOrDownEvent && !isEscapeEvent) {
        return;
      }
      if (isInput && !isEscapeEvent) {
        return;
      }
      event.preventDefault();
      const getToggleButton = this.matches(SELECTOR_DATA_TOGGLE$3) ? this : SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.next(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.findOne(SELECTOR_DATA_TOGGLE$3, event.delegateTarget.parentNode);
      const instance = _Dropdown.getOrCreateInstance(getToggleButton);
      if (isUpOrDownEvent) {
        event.stopPropagation();
        instance.show();
        instance._selectMenuItem(event);
        return;
      }
      if (instance._isShown()) {
        event.stopPropagation();
        instance.hide();
        getToggleButton.focus();
      }
    }
  };
  EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE$3, Dropdown.dataApiKeydownHandler);
  EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, Dropdown.dataApiKeydownHandler);
  EventHandler.on(document, EVENT_CLICK_DATA_API$3, Dropdown.clearMenus);
  EventHandler.on(document, EVENT_KEYUP_DATA_API, Dropdown.clearMenus);
  EventHandler.on(document, EVENT_CLICK_DATA_API$3, SELECTOR_DATA_TOGGLE$3, function(event) {
    event.preventDefault();
    Dropdown.getOrCreateInstance(this).toggle();
  });
  defineJQueryPlugin(Dropdown);
  var NAME$9 = "backdrop";
  var CLASS_NAME_FADE$4 = "fade";
  var CLASS_NAME_SHOW$5 = "show";
  var EVENT_MOUSEDOWN = `mousedown.bs.${NAME$9}`;
  var Default$8 = {
    className: "modal-backdrop",
    clickCallback: null,
    isAnimated: false,
    isVisible: true,
    // if false, we use the backdrop helper without adding any element to the dom
    rootElement: "body"
    // give the choice to place backdrop under different elements
  };
  var DefaultType$8 = {
    className: "string",
    clickCallback: "(function|null)",
    isAnimated: "boolean",
    isVisible: "boolean",
    rootElement: "(element|string)"
  };
  var Backdrop = class extends Config {
    constructor(config) {
      super();
      this._config = this._getConfig(config);
      this._isAppended = false;
      this._element = null;
    }
    // Getters
    static get Default() {
      return Default$8;
    }
    static get DefaultType() {
      return DefaultType$8;
    }
    static get NAME() {
      return NAME$9;
    }
    // Public
    show(callback) {
      if (!this._config.isVisible) {
        execute(callback);
        return;
      }
      this._append();
      const element = this._getElement();
      if (this._config.isAnimated) {
        reflow(element);
      }
      element.classList.add(CLASS_NAME_SHOW$5);
      this._emulateAnimation(() => {
        execute(callback);
      });
    }
    hide(callback) {
      if (!this._config.isVisible) {
        execute(callback);
        return;
      }
      this._getElement().classList.remove(CLASS_NAME_SHOW$5);
      this._emulateAnimation(() => {
        this.dispose();
        execute(callback);
      });
    }
    dispose() {
      if (!this._isAppended) {
        return;
      }
      EventHandler.off(this._element, EVENT_MOUSEDOWN);
      this._element.remove();
      this._isAppended = false;
    }
    // Private
    _getElement() {
      if (!this._element) {
        const backdrop = document.createElement("div");
        backdrop.className = this._config.className;
        if (this._config.isAnimated) {
          backdrop.classList.add(CLASS_NAME_FADE$4);
        }
        this._element = backdrop;
      }
      return this._element;
    }
    _configAfterMerge(config) {
      config.rootElement = getElement(config.rootElement);
      return config;
    }
    _append() {
      if (this._isAppended) {
        return;
      }
      const element = this._getElement();
      this._config.rootElement.append(element);
      EventHandler.on(element, EVENT_MOUSEDOWN, () => {
        execute(this._config.clickCallback);
      });
      this._isAppended = true;
    }
    _emulateAnimation(callback) {
      executeAfterTransition(callback, this._getElement(), this._config.isAnimated);
    }
  };
  var NAME$8 = "focustrap";
  var DATA_KEY$5 = "bs.focustrap";
  var EVENT_KEY$5 = `.${DATA_KEY$5}`;
  var EVENT_FOCUSIN$2 = `focusin${EVENT_KEY$5}`;
  var EVENT_KEYDOWN_TAB = `keydown.tab${EVENT_KEY$5}`;
  var TAB_KEY = "Tab";
  var TAB_NAV_FORWARD = "forward";
  var TAB_NAV_BACKWARD = "backward";
  var Default$7 = {
    autofocus: true,
    trapElement: null
    // The element to trap focus inside of
  };
  var DefaultType$7 = {
    autofocus: "boolean",
    trapElement: "element"
  };
  var FocusTrap = class extends Config {
    constructor(config) {
      super();
      this._config = this._getConfig(config);
      this._isActive = false;
      this._lastTabNavDirection = null;
    }
    // Getters
    static get Default() {
      return Default$7;
    }
    static get DefaultType() {
      return DefaultType$7;
    }
    static get NAME() {
      return NAME$8;
    }
    // Public
    activate() {
      if (this._isActive) {
        return;
      }
      if (this._config.autofocus) {
        this._config.trapElement.focus();
      }
      EventHandler.off(document, EVENT_KEY$5);
      EventHandler.on(document, EVENT_FOCUSIN$2, (event) => this._handleFocusin(event));
      EventHandler.on(document, EVENT_KEYDOWN_TAB, (event) => this._handleKeydown(event));
      this._isActive = true;
    }
    deactivate() {
      if (!this._isActive) {
        return;
      }
      this._isActive = false;
      EventHandler.off(document, EVENT_KEY$5);
    }
    // Private
    _handleFocusin(event) {
      const {
        trapElement
      } = this._config;
      if (event.target === document || event.target === trapElement || trapElement.contains(event.target)) {
        return;
      }
      const elements = SelectorEngine.focusableChildren(trapElement);
      if (elements.length === 0) {
        trapElement.focus();
      } else if (this._lastTabNavDirection === TAB_NAV_BACKWARD) {
        elements[elements.length - 1].focus();
      } else {
        elements[0].focus();
      }
    }
    _handleKeydown(event) {
      if (event.key !== TAB_KEY) {
        return;
      }
      this._lastTabNavDirection = event.shiftKey ? TAB_NAV_BACKWARD : TAB_NAV_FORWARD;
    }
  };
  var SELECTOR_FIXED_CONTENT = ".fixed-top, .fixed-bottom, .is-fixed, .sticky-top";
  var SELECTOR_STICKY_CONTENT = ".sticky-top";
  var PROPERTY_PADDING = "padding-right";
  var PROPERTY_MARGIN = "margin-right";
  var ScrollBarHelper = class {
    constructor() {
      this._element = document.body;
    }
    // Public
    getWidth() {
      const documentWidth = document.documentElement.clientWidth;
      return Math.abs(window.innerWidth - documentWidth);
    }
    hide() {
      const width = this.getWidth();
      this._disableOverFlow();
      this._setElementAttributes(this._element, PROPERTY_PADDING, (calculatedValue) => calculatedValue + width);
      this._setElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING, (calculatedValue) => calculatedValue + width);
      this._setElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN, (calculatedValue) => calculatedValue - width);
    }
    reset() {
      this._resetElementAttributes(this._element, "overflow");
      this._resetElementAttributes(this._element, PROPERTY_PADDING);
      this._resetElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING);
      this._resetElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN);
    }
    isOverflowing() {
      return this.getWidth() > 0;
    }
    // Private
    _disableOverFlow() {
      this._saveInitialAttribute(this._element, "overflow");
      this._element.style.overflow = "hidden";
    }
    _setElementAttributes(selector, styleProperty, callback) {
      const scrollbarWidth = this.getWidth();
      const manipulationCallBack = (element) => {
        if (element !== this._element && window.innerWidth > element.clientWidth + scrollbarWidth) {
          return;
        }
        this._saveInitialAttribute(element, styleProperty);
        const calculatedValue = window.getComputedStyle(element).getPropertyValue(styleProperty);
        element.style.setProperty(styleProperty, `${callback(Number.parseFloat(calculatedValue))}px`);
      };
      this._applyManipulationCallback(selector, manipulationCallBack);
    }
    _saveInitialAttribute(element, styleProperty) {
      const actualValue = element.style.getPropertyValue(styleProperty);
      if (actualValue) {
        Manipulator.setDataAttribute(element, styleProperty, actualValue);
      }
    }
    _resetElementAttributes(selector, styleProperty) {
      const manipulationCallBack = (element) => {
        const value = Manipulator.getDataAttribute(element, styleProperty);
        if (value === null) {
          element.style.removeProperty(styleProperty);
          return;
        }
        Manipulator.removeDataAttribute(element, styleProperty);
        element.style.setProperty(styleProperty, value);
      };
      this._applyManipulationCallback(selector, manipulationCallBack);
    }
    _applyManipulationCallback(selector, callBack) {
      if (isElement2(selector)) {
        callBack(selector);
        return;
      }
      for (const sel of SelectorEngine.find(selector, this._element)) {
        callBack(sel);
      }
    }
  };
  var NAME$7 = "modal";
  var DATA_KEY$4 = "bs.modal";
  var EVENT_KEY$4 = `.${DATA_KEY$4}`;
  var DATA_API_KEY$2 = ".data-api";
  var ESCAPE_KEY$1 = "Escape";
  var EVENT_HIDE$4 = `hide${EVENT_KEY$4}`;
  var EVENT_HIDE_PREVENTED$1 = `hidePrevented${EVENT_KEY$4}`;
  var EVENT_HIDDEN$4 = `hidden${EVENT_KEY$4}`;
  var EVENT_SHOW$4 = `show${EVENT_KEY$4}`;
  var EVENT_SHOWN$4 = `shown${EVENT_KEY$4}`;
  var EVENT_RESIZE$1 = `resize${EVENT_KEY$4}`;
  var EVENT_CLICK_DISMISS = `click.dismiss${EVENT_KEY$4}`;
  var EVENT_MOUSEDOWN_DISMISS = `mousedown.dismiss${EVENT_KEY$4}`;
  var EVENT_KEYDOWN_DISMISS$1 = `keydown.dismiss${EVENT_KEY$4}`;
  var EVENT_CLICK_DATA_API$2 = `click${EVENT_KEY$4}${DATA_API_KEY$2}`;
  var CLASS_NAME_OPEN = "modal-open";
  var CLASS_NAME_FADE$3 = "fade";
  var CLASS_NAME_SHOW$4 = "show";
  var CLASS_NAME_STATIC = "modal-static";
  var OPEN_SELECTOR$1 = ".modal.show";
  var SELECTOR_DIALOG = ".modal-dialog";
  var SELECTOR_MODAL_BODY = ".modal-body";
  var SELECTOR_DATA_TOGGLE$2 = '[data-bs-toggle="modal"]';
  var Default$6 = {
    backdrop: true,
    focus: true,
    keyboard: true
  };
  var DefaultType$6 = {
    backdrop: "(boolean|string)",
    focus: "boolean",
    keyboard: "boolean"
  };
  var Modal = class _Modal extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, this._element);
      this._backdrop = this._initializeBackDrop();
      this._focustrap = this._initializeFocusTrap();
      this._isShown = false;
      this._isTransitioning = false;
      this._scrollBar = new ScrollBarHelper();
      this._addEventListeners();
    }
    // Getters
    static get Default() {
      return Default$6;
    }
    static get DefaultType() {
      return DefaultType$6;
    }
    static get NAME() {
      return NAME$7;
    }
    // Public
    toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    }
    show(relatedTarget) {
      if (this._isShown || this._isTransitioning) {
        return;
      }
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$4, {
        relatedTarget
      });
      if (showEvent.defaultPrevented) {
        return;
      }
      this._isShown = true;
      this._isTransitioning = true;
      this._scrollBar.hide();
      document.body.classList.add(CLASS_NAME_OPEN);
      this._adjustDialog();
      this._backdrop.show(() => this._showElement(relatedTarget));
    }
    hide() {
      if (!this._isShown || this._isTransitioning) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$4);
      if (hideEvent.defaultPrevented) {
        return;
      }
      this._isShown = false;
      this._isTransitioning = true;
      this._focustrap.deactivate();
      this._element.classList.remove(CLASS_NAME_SHOW$4);
      this._queueCallback(() => this._hideModal(), this._element, this._isAnimated());
    }
    dispose() {
      EventHandler.off(window, EVENT_KEY$4);
      EventHandler.off(this._dialog, EVENT_KEY$4);
      this._backdrop.dispose();
      this._focustrap.deactivate();
      super.dispose();
    }
    handleUpdate() {
      this._adjustDialog();
    }
    // Private
    _initializeBackDrop() {
      return new Backdrop({
        isVisible: Boolean(this._config.backdrop),
        // 'static' option will be translated to true, and booleans will keep their value,
        isAnimated: this._isAnimated()
      });
    }
    _initializeFocusTrap() {
      return new FocusTrap({
        trapElement: this._element
      });
    }
    _showElement(relatedTarget) {
      if (!document.body.contains(this._element)) {
        document.body.append(this._element);
      }
      this._element.style.display = "block";
      this._element.removeAttribute("aria-hidden");
      this._element.setAttribute("aria-modal", true);
      this._element.setAttribute("role", "dialog");
      this._element.scrollTop = 0;
      const modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog);
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
      reflow(this._element);
      this._element.classList.add(CLASS_NAME_SHOW$4);
      const transitionComplete = () => {
        if (this._config.focus) {
          this._focustrap.activate();
        }
        this._isTransitioning = false;
        EventHandler.trigger(this._element, EVENT_SHOWN$4, {
          relatedTarget
        });
      };
      this._queueCallback(transitionComplete, this._dialog, this._isAnimated());
    }
    _addEventListeners() {
      EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS$1, (event) => {
        if (event.key !== ESCAPE_KEY$1) {
          return;
        }
        if (this._config.keyboard) {
          this.hide();
          return;
        }
        this._triggerBackdropTransition();
      });
      EventHandler.on(window, EVENT_RESIZE$1, () => {
        if (this._isShown && !this._isTransitioning) {
          this._adjustDialog();
        }
      });
      EventHandler.on(this._element, EVENT_MOUSEDOWN_DISMISS, (event) => {
        EventHandler.one(this._element, EVENT_CLICK_DISMISS, (event2) => {
          if (this._element !== event.target || this._element !== event2.target) {
            return;
          }
          if (this._config.backdrop === "static") {
            this._triggerBackdropTransition();
            return;
          }
          if (this._config.backdrop) {
            this.hide();
          }
        });
      });
    }
    _hideModal() {
      this._element.style.display = "none";
      this._element.setAttribute("aria-hidden", true);
      this._element.removeAttribute("aria-modal");
      this._element.removeAttribute("role");
      this._isTransitioning = false;
      this._backdrop.hide(() => {
        document.body.classList.remove(CLASS_NAME_OPEN);
        this._resetAdjustments();
        this._scrollBar.reset();
        EventHandler.trigger(this._element, EVENT_HIDDEN$4);
      });
    }
    _isAnimated() {
      return this._element.classList.contains(CLASS_NAME_FADE$3);
    }
    _triggerBackdropTransition() {
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED$1);
      if (hideEvent.defaultPrevented) {
        return;
      }
      const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;
      const initialOverflowY = this._element.style.overflowY;
      if (initialOverflowY === "hidden" || this._element.classList.contains(CLASS_NAME_STATIC)) {
        return;
      }
      if (!isModalOverflowing) {
        this._element.style.overflowY = "hidden";
      }
      this._element.classList.add(CLASS_NAME_STATIC);
      this._queueCallback(() => {
        this._element.classList.remove(CLASS_NAME_STATIC);
        this._queueCallback(() => {
          this._element.style.overflowY = initialOverflowY;
        }, this._dialog);
      }, this._dialog);
      this._element.focus();
    }
    /**
     * The following methods are used to handle overflowing modals
     */
    _adjustDialog() {
      const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;
      const scrollbarWidth = this._scrollBar.getWidth();
      const isBodyOverflowing = scrollbarWidth > 0;
      if (isBodyOverflowing && !isModalOverflowing) {
        const property = isRTL() ? "paddingLeft" : "paddingRight";
        this._element.style[property] = `${scrollbarWidth}px`;
      }
      if (!isBodyOverflowing && isModalOverflowing) {
        const property = isRTL() ? "paddingRight" : "paddingLeft";
        this._element.style[property] = `${scrollbarWidth}px`;
      }
    }
    _resetAdjustments() {
      this._element.style.paddingLeft = "";
      this._element.style.paddingRight = "";
    }
    // Static
    static jQueryInterface(config, relatedTarget) {
      return this.each(function() {
        const data = _Modal.getOrCreateInstance(this, config);
        if (typeof config !== "string") {
          return;
        }
        if (typeof data[config] === "undefined") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config](relatedTarget);
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$2, SELECTOR_DATA_TOGGLE$2, function(event) {
    const target = SelectorEngine.getElementFromSelector(this);
    if (["A", "AREA"].includes(this.tagName)) {
      event.preventDefault();
    }
    EventHandler.one(target, EVENT_SHOW$4, (showEvent) => {
      if (showEvent.defaultPrevented) {
        return;
      }
      EventHandler.one(target, EVENT_HIDDEN$4, () => {
        if (isVisible(this)) {
          this.focus();
        }
      });
    });
    const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR$1);
    if (alreadyOpen) {
      Modal.getInstance(alreadyOpen).hide();
    }
    const data = Modal.getOrCreateInstance(target);
    data.toggle(this);
  });
  enableDismissTrigger(Modal);
  defineJQueryPlugin(Modal);
  var NAME$6 = "offcanvas";
  var DATA_KEY$3 = "bs.offcanvas";
  var EVENT_KEY$3 = `.${DATA_KEY$3}`;
  var DATA_API_KEY$1 = ".data-api";
  var EVENT_LOAD_DATA_API$2 = `load${EVENT_KEY$3}${DATA_API_KEY$1}`;
  var ESCAPE_KEY = "Escape";
  var CLASS_NAME_SHOW$3 = "show";
  var CLASS_NAME_SHOWING$1 = "showing";
  var CLASS_NAME_HIDING = "hiding";
  var CLASS_NAME_BACKDROP = "offcanvas-backdrop";
  var OPEN_SELECTOR = ".offcanvas.show";
  var EVENT_SHOW$3 = `show${EVENT_KEY$3}`;
  var EVENT_SHOWN$3 = `shown${EVENT_KEY$3}`;
  var EVENT_HIDE$3 = `hide${EVENT_KEY$3}`;
  var EVENT_HIDE_PREVENTED = `hidePrevented${EVENT_KEY$3}`;
  var EVENT_HIDDEN$3 = `hidden${EVENT_KEY$3}`;
  var EVENT_RESIZE = `resize${EVENT_KEY$3}`;
  var EVENT_CLICK_DATA_API$1 = `click${EVENT_KEY$3}${DATA_API_KEY$1}`;
  var EVENT_KEYDOWN_DISMISS = `keydown.dismiss${EVENT_KEY$3}`;
  var SELECTOR_DATA_TOGGLE$1 = '[data-bs-toggle="offcanvas"]';
  var Default$5 = {
    backdrop: true,
    keyboard: true,
    scroll: false
  };
  var DefaultType$5 = {
    backdrop: "(boolean|string)",
    keyboard: "boolean",
    scroll: "boolean"
  };
  var Offcanvas = class _Offcanvas extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._isShown = false;
      this._backdrop = this._initializeBackDrop();
      this._focustrap = this._initializeFocusTrap();
      this._addEventListeners();
    }
    // Getters
    static get Default() {
      return Default$5;
    }
    static get DefaultType() {
      return DefaultType$5;
    }
    static get NAME() {
      return NAME$6;
    }
    // Public
    toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    }
    show(relatedTarget) {
      if (this._isShown) {
        return;
      }
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$3, {
        relatedTarget
      });
      if (showEvent.defaultPrevented) {
        return;
      }
      this._isShown = true;
      this._backdrop.show();
      if (!this._config.scroll) {
        new ScrollBarHelper().hide();
      }
      this._element.setAttribute("aria-modal", true);
      this._element.setAttribute("role", "dialog");
      this._element.classList.add(CLASS_NAME_SHOWING$1);
      const completeCallBack = () => {
        if (!this._config.scroll || this._config.backdrop) {
          this._focustrap.activate();
        }
        this._element.classList.add(CLASS_NAME_SHOW$3);
        this._element.classList.remove(CLASS_NAME_SHOWING$1);
        EventHandler.trigger(this._element, EVENT_SHOWN$3, {
          relatedTarget
        });
      };
      this._queueCallback(completeCallBack, this._element, true);
    }
    hide() {
      if (!this._isShown) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$3);
      if (hideEvent.defaultPrevented) {
        return;
      }
      this._focustrap.deactivate();
      this._element.blur();
      this._isShown = false;
      this._element.classList.add(CLASS_NAME_HIDING);
      this._backdrop.hide();
      const completeCallback = () => {
        this._element.classList.remove(CLASS_NAME_SHOW$3, CLASS_NAME_HIDING);
        this._element.removeAttribute("aria-modal");
        this._element.removeAttribute("role");
        if (!this._config.scroll) {
          new ScrollBarHelper().reset();
        }
        EventHandler.trigger(this._element, EVENT_HIDDEN$3);
      };
      this._queueCallback(completeCallback, this._element, true);
    }
    dispose() {
      this._backdrop.dispose();
      this._focustrap.deactivate();
      super.dispose();
    }
    // Private
    _initializeBackDrop() {
      const clickCallback = () => {
        if (this._config.backdrop === "static") {
          EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
          return;
        }
        this.hide();
      };
      const isVisible2 = Boolean(this._config.backdrop);
      return new Backdrop({
        className: CLASS_NAME_BACKDROP,
        isVisible: isVisible2,
        isAnimated: true,
        rootElement: this._element.parentNode,
        clickCallback: isVisible2 ? clickCallback : null
      });
    }
    _initializeFocusTrap() {
      return new FocusTrap({
        trapElement: this._element
      });
    }
    _addEventListeners() {
      EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, (event) => {
        if (event.key !== ESCAPE_KEY) {
          return;
        }
        if (this._config.keyboard) {
          this.hide();
          return;
        }
        EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED);
      });
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Offcanvas.getOrCreateInstance(this, config);
        if (typeof config !== "string") {
          return;
        }
        if (data[config] === void 0 || config.startsWith("_") || config === "constructor") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config](this);
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API$1, SELECTOR_DATA_TOGGLE$1, function(event) {
    const target = SelectorEngine.getElementFromSelector(this);
    if (["A", "AREA"].includes(this.tagName)) {
      event.preventDefault();
    }
    if (isDisabled(this)) {
      return;
    }
    EventHandler.one(target, EVENT_HIDDEN$3, () => {
      if (isVisible(this)) {
        this.focus();
      }
    });
    const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR);
    if (alreadyOpen && alreadyOpen !== target) {
      Offcanvas.getInstance(alreadyOpen).hide();
    }
    const data = Offcanvas.getOrCreateInstance(target);
    data.toggle(this);
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API$2, () => {
    for (const selector of SelectorEngine.find(OPEN_SELECTOR)) {
      Offcanvas.getOrCreateInstance(selector).show();
    }
  });
  EventHandler.on(window, EVENT_RESIZE, () => {
    for (const element of SelectorEngine.find("[aria-modal][class*=show][class*=offcanvas-]")) {
      if (getComputedStyle(element).position !== "fixed") {
        Offcanvas.getOrCreateInstance(element).hide();
      }
    }
  });
  enableDismissTrigger(Offcanvas);
  defineJQueryPlugin(Offcanvas);
  var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;
  var DefaultAllowlist = {
    // Global attributes allowed on any supplied element below.
    "*": ["class", "dir", "id", "lang", "role", ARIA_ATTRIBUTE_PATTERN],
    a: ["target", "href", "title", "rel"],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    dd: [],
    div: [],
    dl: [],
    dt: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: ["src", "srcset", "alt", "title", "width", "height"],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
  };
  var uriAttributes = /* @__PURE__ */ new Set(["background", "cite", "href", "itemtype", "longdesc", "poster", "src", "xlink:href"]);
  var SAFE_URL_PATTERN = /^(?!javascript:)(?:[a-z0-9+.-]+:|[^&:/?#]*(?:[/?#]|$))/i;
  var allowedAttribute = (attribute, allowedAttributeList) => {
    const attributeName = attribute.nodeName.toLowerCase();
    if (allowedAttributeList.includes(attributeName)) {
      if (uriAttributes.has(attributeName)) {
        return Boolean(SAFE_URL_PATTERN.test(attribute.nodeValue));
      }
      return true;
    }
    return allowedAttributeList.filter((attributeRegex) => attributeRegex instanceof RegExp).some((regex) => regex.test(attributeName));
  };
  function sanitizeHtml(unsafeHtml, allowList, sanitizeFunction) {
    if (!unsafeHtml.length) {
      return unsafeHtml;
    }
    if (sanitizeFunction && typeof sanitizeFunction === "function") {
      return sanitizeFunction(unsafeHtml);
    }
    const domParser = new window.DOMParser();
    const createdDocument = domParser.parseFromString(unsafeHtml, "text/html");
    const elements = [].concat(...createdDocument.body.querySelectorAll("*"));
    for (const element of elements) {
      const elementName = element.nodeName.toLowerCase();
      if (!Object.keys(allowList).includes(elementName)) {
        element.remove();
        continue;
      }
      const attributeList = [].concat(...element.attributes);
      const allowedAttributes = [].concat(allowList["*"] || [], allowList[elementName] || []);
      for (const attribute of attributeList) {
        if (!allowedAttribute(attribute, allowedAttributes)) {
          element.removeAttribute(attribute.nodeName);
        }
      }
    }
    return createdDocument.body.innerHTML;
  }
  var NAME$5 = "TemplateFactory";
  var Default$4 = {
    allowList: DefaultAllowlist,
    content: {},
    // { selector : text ,  selector2 : text2 , }
    extraClass: "",
    html: false,
    sanitize: true,
    sanitizeFn: null,
    template: "<div></div>"
  };
  var DefaultType$4 = {
    allowList: "object",
    content: "object",
    extraClass: "(string|function)",
    html: "boolean",
    sanitize: "boolean",
    sanitizeFn: "(null|function)",
    template: "string"
  };
  var DefaultContentType = {
    entry: "(string|element|function|null)",
    selector: "(string|element)"
  };
  var TemplateFactory = class extends Config {
    constructor(config) {
      super();
      this._config = this._getConfig(config);
    }
    // Getters
    static get Default() {
      return Default$4;
    }
    static get DefaultType() {
      return DefaultType$4;
    }
    static get NAME() {
      return NAME$5;
    }
    // Public
    getContent() {
      return Object.values(this._config.content).map((config) => this._resolvePossibleFunction(config)).filter(Boolean);
    }
    hasContent() {
      return this.getContent().length > 0;
    }
    changeContent(content) {
      this._checkContent(content);
      this._config.content = {
        ...this._config.content,
        ...content
      };
      return this;
    }
    toHtml() {
      const templateWrapper = document.createElement("div");
      templateWrapper.innerHTML = this._maybeSanitize(this._config.template);
      for (const [selector, text] of Object.entries(this._config.content)) {
        this._setContent(templateWrapper, text, selector);
      }
      const template = templateWrapper.children[0];
      const extraClass = this._resolvePossibleFunction(this._config.extraClass);
      if (extraClass) {
        template.classList.add(...extraClass.split(" "));
      }
      return template;
    }
    // Private
    _typeCheckConfig(config) {
      super._typeCheckConfig(config);
      this._checkContent(config.content);
    }
    _checkContent(arg) {
      for (const [selector, content] of Object.entries(arg)) {
        super._typeCheckConfig({
          selector,
          entry: content
        }, DefaultContentType);
      }
    }
    _setContent(template, content, selector) {
      const templateElement = SelectorEngine.findOne(selector, template);
      if (!templateElement) {
        return;
      }
      content = this._resolvePossibleFunction(content);
      if (!content) {
        templateElement.remove();
        return;
      }
      if (isElement2(content)) {
        this._putElementInTemplate(getElement(content), templateElement);
        return;
      }
      if (this._config.html) {
        templateElement.innerHTML = this._maybeSanitize(content);
        return;
      }
      templateElement.textContent = content;
    }
    _maybeSanitize(arg) {
      return this._config.sanitize ? sanitizeHtml(arg, this._config.allowList, this._config.sanitizeFn) : arg;
    }
    _resolvePossibleFunction(arg) {
      return execute(arg, [void 0, this]);
    }
    _putElementInTemplate(element, templateElement) {
      if (this._config.html) {
        templateElement.innerHTML = "";
        templateElement.append(element);
        return;
      }
      templateElement.textContent = element.textContent;
    }
  };
  var NAME$4 = "tooltip";
  var DISALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set(["sanitize", "allowList", "sanitizeFn"]);
  var CLASS_NAME_FADE$2 = "fade";
  var CLASS_NAME_MODAL = "modal";
  var CLASS_NAME_SHOW$2 = "show";
  var SELECTOR_TOOLTIP_INNER = ".tooltip-inner";
  var SELECTOR_MODAL = `.${CLASS_NAME_MODAL}`;
  var EVENT_MODAL_HIDE = "hide.bs.modal";
  var TRIGGER_HOVER = "hover";
  var TRIGGER_FOCUS = "focus";
  var TRIGGER_CLICK = "click";
  var TRIGGER_MANUAL = "manual";
  var EVENT_HIDE$2 = "hide";
  var EVENT_HIDDEN$2 = "hidden";
  var EVENT_SHOW$2 = "show";
  var EVENT_SHOWN$2 = "shown";
  var EVENT_INSERTED = "inserted";
  var EVENT_CLICK$1 = "click";
  var EVENT_FOCUSIN$1 = "focusin";
  var EVENT_FOCUSOUT$1 = "focusout";
  var EVENT_MOUSEENTER = "mouseenter";
  var EVENT_MOUSELEAVE = "mouseleave";
  var AttachmentMap = {
    AUTO: "auto",
    TOP: "top",
    RIGHT: isRTL() ? "left" : "right",
    BOTTOM: "bottom",
    LEFT: isRTL() ? "right" : "left"
  };
  var Default$3 = {
    allowList: DefaultAllowlist,
    animation: true,
    boundary: "clippingParents",
    container: false,
    customClass: "",
    delay: 0,
    fallbackPlacements: ["top", "right", "bottom", "left"],
    html: false,
    offset: [0, 6],
    placement: "top",
    popperConfig: null,
    sanitize: true,
    sanitizeFn: null,
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    title: "",
    trigger: "hover focus"
  };
  var DefaultType$3 = {
    allowList: "object",
    animation: "boolean",
    boundary: "(string|element)",
    container: "(string|element|boolean)",
    customClass: "(string|function)",
    delay: "(number|object)",
    fallbackPlacements: "array",
    html: "boolean",
    offset: "(array|string|function)",
    placement: "(string|function)",
    popperConfig: "(null|object|function)",
    sanitize: "boolean",
    sanitizeFn: "(null|function)",
    selector: "(string|boolean)",
    template: "string",
    title: "(string|element|function)",
    trigger: "string"
  };
  var Tooltip = class _Tooltip extends BaseComponent {
    constructor(element, config) {
      if (typeof lib_exports === "undefined") {
        throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org/docs/v2/)");
      }
      super(element, config);
      this._isEnabled = true;
      this._timeout = 0;
      this._isHovered = null;
      this._activeTrigger = {};
      this._popper = null;
      this._templateFactory = null;
      this._newContent = null;
      this.tip = null;
      this._setListeners();
      if (!this._config.selector) {
        this._fixTitle();
      }
    }
    // Getters
    static get Default() {
      return Default$3;
    }
    static get DefaultType() {
      return DefaultType$3;
    }
    static get NAME() {
      return NAME$4;
    }
    // Public
    enable() {
      this._isEnabled = true;
    }
    disable() {
      this._isEnabled = false;
    }
    toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    }
    toggle() {
      if (!this._isEnabled) {
        return;
      }
      if (this._isShown()) {
        this._leave();
        return;
      }
      this._enter();
    }
    dispose() {
      clearTimeout(this._timeout);
      EventHandler.off(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
      if (this._element.getAttribute("data-bs-original-title")) {
        this._element.setAttribute("title", this._element.getAttribute("data-bs-original-title"));
      }
      this._disposePopper();
      super.dispose();
    }
    show() {
      if (this._element.style.display === "none") {
        throw new Error("Please use show on visible elements");
      }
      if (!(this._isWithContent() && this._isEnabled)) {
        return;
      }
      const showEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOW$2));
      const shadowRoot = findShadowRoot(this._element);
      const isInTheDom = (shadowRoot || this._element.ownerDocument.documentElement).contains(this._element);
      if (showEvent.defaultPrevented || !isInTheDom) {
        return;
      }
      this._disposePopper();
      const tip = this._getTipElement();
      this._element.setAttribute("aria-describedby", tip.getAttribute("id"));
      const {
        container
      } = this._config;
      if (!this._element.ownerDocument.documentElement.contains(this.tip)) {
        container.append(tip);
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_INSERTED));
      }
      this._popper = this._createPopper(tip);
      tip.classList.add(CLASS_NAME_SHOW$2);
      if ("ontouchstart" in document.documentElement) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.on(element, "mouseover", noop);
        }
      }
      const complete = () => {
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOWN$2));
        if (this._isHovered === false) {
          this._leave();
        }
        this._isHovered = false;
      };
      this._queueCallback(complete, this.tip, this._isAnimated());
    }
    hide() {
      if (!this._isShown()) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDE$2));
      if (hideEvent.defaultPrevented) {
        return;
      }
      const tip = this._getTipElement();
      tip.classList.remove(CLASS_NAME_SHOW$2);
      if ("ontouchstart" in document.documentElement) {
        for (const element of [].concat(...document.body.children)) {
          EventHandler.off(element, "mouseover", noop);
        }
      }
      this._activeTrigger[TRIGGER_CLICK] = false;
      this._activeTrigger[TRIGGER_FOCUS] = false;
      this._activeTrigger[TRIGGER_HOVER] = false;
      this._isHovered = null;
      const complete = () => {
        if (this._isWithActiveTrigger()) {
          return;
        }
        if (!this._isHovered) {
          this._disposePopper();
        }
        this._element.removeAttribute("aria-describedby");
        EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDDEN$2));
      };
      this._queueCallback(complete, this.tip, this._isAnimated());
    }
    update() {
      if (this._popper) {
        this._popper.update();
      }
    }
    // Protected
    _isWithContent() {
      return Boolean(this._getTitle());
    }
    _getTipElement() {
      if (!this.tip) {
        this.tip = this._createTipElement(this._newContent || this._getContentForTemplate());
      }
      return this.tip;
    }
    _createTipElement(content) {
      const tip = this._getTemplateFactory(content).toHtml();
      if (!tip) {
        return null;
      }
      tip.classList.remove(CLASS_NAME_FADE$2, CLASS_NAME_SHOW$2);
      tip.classList.add(`bs-${this.constructor.NAME}-auto`);
      const tipId = getUID(this.constructor.NAME).toString();
      tip.setAttribute("id", tipId);
      if (this._isAnimated()) {
        tip.classList.add(CLASS_NAME_FADE$2);
      }
      return tip;
    }
    setContent(content) {
      this._newContent = content;
      if (this._isShown()) {
        this._disposePopper();
        this.show();
      }
    }
    _getTemplateFactory(content) {
      if (this._templateFactory) {
        this._templateFactory.changeContent(content);
      } else {
        this._templateFactory = new TemplateFactory({
          ...this._config,
          // the `content` var has to be after `this._config`
          // to override config.content in case of popover
          content,
          extraClass: this._resolvePossibleFunction(this._config.customClass)
        });
      }
      return this._templateFactory;
    }
    _getContentForTemplate() {
      return {
        [SELECTOR_TOOLTIP_INNER]: this._getTitle()
      };
    }
    _getTitle() {
      return this._resolvePossibleFunction(this._config.title) || this._element.getAttribute("data-bs-original-title");
    }
    // Private
    _initializeOnDelegatedTarget(event) {
      return this.constructor.getOrCreateInstance(event.delegateTarget, this._getDelegateConfig());
    }
    _isAnimated() {
      return this._config.animation || this.tip && this.tip.classList.contains(CLASS_NAME_FADE$2);
    }
    _isShown() {
      return this.tip && this.tip.classList.contains(CLASS_NAME_SHOW$2);
    }
    _createPopper(tip) {
      const placement = execute(this._config.placement, [this, tip, this._element]);
      const attachment = AttachmentMap[placement.toUpperCase()];
      return createPopper3(this._element, tip, this._getPopperConfig(attachment));
    }
    _getOffset() {
      const {
        offset: offset2
      } = this._config;
      if (typeof offset2 === "string") {
        return offset2.split(",").map((value) => Number.parseInt(value, 10));
      }
      if (typeof offset2 === "function") {
        return (popperData) => offset2(popperData, this._element);
      }
      return offset2;
    }
    _resolvePossibleFunction(arg) {
      return execute(arg, [this._element, this._element]);
    }
    _getPopperConfig(attachment) {
      const defaultBsPopperConfig = {
        placement: attachment,
        modifiers: [{
          name: "flip",
          options: {
            fallbackPlacements: this._config.fallbackPlacements
          }
        }, {
          name: "offset",
          options: {
            offset: this._getOffset()
          }
        }, {
          name: "preventOverflow",
          options: {
            boundary: this._config.boundary
          }
        }, {
          name: "arrow",
          options: {
            element: `.${this.constructor.NAME}-arrow`
          }
        }, {
          name: "preSetPlacement",
          enabled: true,
          phase: "beforeMain",
          fn: (data) => {
            this._getTipElement().setAttribute("data-popper-placement", data.state.placement);
          }
        }]
      };
      return {
        ...defaultBsPopperConfig,
        ...execute(this._config.popperConfig, [void 0, defaultBsPopperConfig])
      };
    }
    _setListeners() {
      const triggers = this._config.trigger.split(" ");
      for (const trigger of triggers) {
        if (trigger === "click") {
          EventHandler.on(this._element, this.constructor.eventName(EVENT_CLICK$1), this._config.selector, (event) => {
            const context = this._initializeOnDelegatedTarget(event);
            context._activeTrigger[TRIGGER_CLICK] = !(context._isShown() && context._activeTrigger[TRIGGER_CLICK]);
            context.toggle();
          });
        } else if (trigger !== TRIGGER_MANUAL) {
          const eventIn = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSEENTER) : this.constructor.eventName(EVENT_FOCUSIN$1);
          const eventOut = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSELEAVE) : this.constructor.eventName(EVENT_FOCUSOUT$1);
          EventHandler.on(this._element, eventIn, this._config.selector, (event) => {
            const context = this._initializeOnDelegatedTarget(event);
            context._activeTrigger[event.type === "focusin" ? TRIGGER_FOCUS : TRIGGER_HOVER] = true;
            context._enter();
          });
          EventHandler.on(this._element, eventOut, this._config.selector, (event) => {
            const context = this._initializeOnDelegatedTarget(event);
            context._activeTrigger[event.type === "focusout" ? TRIGGER_FOCUS : TRIGGER_HOVER] = context._element.contains(event.relatedTarget);
            context._leave();
          });
        }
      }
      this._hideModalHandler = () => {
        if (this._element) {
          this.hide();
        }
      };
      EventHandler.on(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler);
    }
    _fixTitle() {
      const title = this._element.getAttribute("title");
      if (!title) {
        return;
      }
      if (!this._element.getAttribute("aria-label") && !this._element.textContent.trim()) {
        this._element.setAttribute("aria-label", title);
      }
      this._element.setAttribute("data-bs-original-title", title);
      this._element.removeAttribute("title");
    }
    _enter() {
      if (this._isShown() || this._isHovered) {
        this._isHovered = true;
        return;
      }
      this._isHovered = true;
      this._setTimeout(() => {
        if (this._isHovered) {
          this.show();
        }
      }, this._config.delay.show);
    }
    _leave() {
      if (this._isWithActiveTrigger()) {
        return;
      }
      this._isHovered = false;
      this._setTimeout(() => {
        if (!this._isHovered) {
          this.hide();
        }
      }, this._config.delay.hide);
    }
    _setTimeout(handler, timeout) {
      clearTimeout(this._timeout);
      this._timeout = setTimeout(handler, timeout);
    }
    _isWithActiveTrigger() {
      return Object.values(this._activeTrigger).includes(true);
    }
    _getConfig(config) {
      const dataAttributes = Manipulator.getDataAttributes(this._element);
      for (const dataAttribute of Object.keys(dataAttributes)) {
        if (DISALLOWED_ATTRIBUTES.has(dataAttribute)) {
          delete dataAttributes[dataAttribute];
        }
      }
      config = {
        ...dataAttributes,
        ...typeof config === "object" && config ? config : {}
      };
      config = this._mergeConfigObj(config);
      config = this._configAfterMerge(config);
      this._typeCheckConfig(config);
      return config;
    }
    _configAfterMerge(config) {
      config.container = config.container === false ? document.body : getElement(config.container);
      if (typeof config.delay === "number") {
        config.delay = {
          show: config.delay,
          hide: config.delay
        };
      }
      if (typeof config.title === "number") {
        config.title = config.title.toString();
      }
      if (typeof config.content === "number") {
        config.content = config.content.toString();
      }
      return config;
    }
    _getDelegateConfig() {
      const config = {};
      for (const [key, value] of Object.entries(this._config)) {
        if (this.constructor.Default[key] !== value) {
          config[key] = value;
        }
      }
      config.selector = false;
      config.trigger = "manual";
      return config;
    }
    _disposePopper() {
      if (this._popper) {
        this._popper.destroy();
        this._popper = null;
      }
      if (this.tip) {
        this.tip.remove();
        this.tip = null;
      }
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Tooltip.getOrCreateInstance(this, config);
        if (typeof config !== "string") {
          return;
        }
        if (typeof data[config] === "undefined") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config]();
      });
    }
  };
  defineJQueryPlugin(Tooltip);
  var NAME$3 = "popover";
  var SELECTOR_TITLE = ".popover-header";
  var SELECTOR_CONTENT = ".popover-body";
  var Default$2 = {
    ...Tooltip.Default,
    content: "",
    offset: [0, 8],
    placement: "right",
    template: '<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
    trigger: "click"
  };
  var DefaultType$2 = {
    ...Tooltip.DefaultType,
    content: "(null|string|element|function)"
  };
  var Popover = class _Popover extends Tooltip {
    // Getters
    static get Default() {
      return Default$2;
    }
    static get DefaultType() {
      return DefaultType$2;
    }
    static get NAME() {
      return NAME$3;
    }
    // Overrides
    _isWithContent() {
      return this._getTitle() || this._getContent();
    }
    // Private
    _getContentForTemplate() {
      return {
        [SELECTOR_TITLE]: this._getTitle(),
        [SELECTOR_CONTENT]: this._getContent()
      };
    }
    _getContent() {
      return this._resolvePossibleFunction(this._config.content);
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Popover.getOrCreateInstance(this, config);
        if (typeof config !== "string") {
          return;
        }
        if (typeof data[config] === "undefined") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config]();
      });
    }
  };
  defineJQueryPlugin(Popover);
  var NAME$2 = "scrollspy";
  var DATA_KEY$2 = "bs.scrollspy";
  var EVENT_KEY$2 = `.${DATA_KEY$2}`;
  var DATA_API_KEY = ".data-api";
  var EVENT_ACTIVATE = `activate${EVENT_KEY$2}`;
  var EVENT_CLICK = `click${EVENT_KEY$2}`;
  var EVENT_LOAD_DATA_API$1 = `load${EVENT_KEY$2}${DATA_API_KEY}`;
  var CLASS_NAME_DROPDOWN_ITEM = "dropdown-item";
  var CLASS_NAME_ACTIVE$1 = "active";
  var SELECTOR_DATA_SPY = '[data-bs-spy="scroll"]';
  var SELECTOR_TARGET_LINKS = "[href]";
  var SELECTOR_NAV_LIST_GROUP = ".nav, .list-group";
  var SELECTOR_NAV_LINKS = ".nav-link";
  var SELECTOR_NAV_ITEMS = ".nav-item";
  var SELECTOR_LIST_ITEMS = ".list-group-item";
  var SELECTOR_LINK_ITEMS = `${SELECTOR_NAV_LINKS}, ${SELECTOR_NAV_ITEMS} > ${SELECTOR_NAV_LINKS}, ${SELECTOR_LIST_ITEMS}`;
  var SELECTOR_DROPDOWN = ".dropdown";
  var SELECTOR_DROPDOWN_TOGGLE$1 = ".dropdown-toggle";
  var Default$1 = {
    offset: null,
    // TODO: v6 @deprecated, keep it for backwards compatibility reasons
    rootMargin: "0px 0px -25%",
    smoothScroll: false,
    target: null,
    threshold: [0.1, 0.5, 1]
  };
  var DefaultType$1 = {
    offset: "(number|null)",
    // TODO v6 @deprecated, keep it for backwards compatibility reasons
    rootMargin: "string",
    smoothScroll: "boolean",
    target: "element",
    threshold: "array"
  };
  var ScrollSpy = class _ScrollSpy extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._targetLinks = /* @__PURE__ */ new Map();
      this._observableSections = /* @__PURE__ */ new Map();
      this._rootElement = getComputedStyle(this._element).overflowY === "visible" ? null : this._element;
      this._activeTarget = null;
      this._observer = null;
      this._previousScrollData = {
        visibleEntryTop: 0,
        parentScrollTop: 0
      };
      this.refresh();
    }
    // Getters
    static get Default() {
      return Default$1;
    }
    static get DefaultType() {
      return DefaultType$1;
    }
    static get NAME() {
      return NAME$2;
    }
    // Public
    refresh() {
      this._initializeTargetsAndObservables();
      this._maybeEnableSmoothScroll();
      if (this._observer) {
        this._observer.disconnect();
      } else {
        this._observer = this._getNewObserver();
      }
      for (const section of this._observableSections.values()) {
        this._observer.observe(section);
      }
    }
    dispose() {
      this._observer.disconnect();
      super.dispose();
    }
    // Private
    _configAfterMerge(config) {
      config.target = getElement(config.target) || document.body;
      config.rootMargin = config.offset ? `${config.offset}px 0px -30%` : config.rootMargin;
      if (typeof config.threshold === "string") {
        config.threshold = config.threshold.split(",").map((value) => Number.parseFloat(value));
      }
      return config;
    }
    _maybeEnableSmoothScroll() {
      if (!this._config.smoothScroll) {
        return;
      }
      EventHandler.off(this._config.target, EVENT_CLICK);
      EventHandler.on(this._config.target, EVENT_CLICK, SELECTOR_TARGET_LINKS, (event) => {
        const observableSection = this._observableSections.get(event.target.hash);
        if (observableSection) {
          event.preventDefault();
          const root = this._rootElement || window;
          const height = observableSection.offsetTop - this._element.offsetTop;
          if (root.scrollTo) {
            root.scrollTo({
              top: height,
              behavior: "smooth"
            });
            return;
          }
          root.scrollTop = height;
        }
      });
    }
    _getNewObserver() {
      const options = {
        root: this._rootElement,
        threshold: this._config.threshold,
        rootMargin: this._config.rootMargin
      };
      return new IntersectionObserver((entries) => this._observerCallback(entries), options);
    }
    // The logic of selection
    _observerCallback(entries) {
      const targetElement = (entry) => this._targetLinks.get(`#${entry.target.id}`);
      const activate = (entry) => {
        this._previousScrollData.visibleEntryTop = entry.target.offsetTop;
        this._process(targetElement(entry));
      };
      const parentScrollTop = (this._rootElement || document.documentElement).scrollTop;
      const userScrollsDown = parentScrollTop >= this._previousScrollData.parentScrollTop;
      this._previousScrollData.parentScrollTop = parentScrollTop;
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          this._activeTarget = null;
          this._clearActiveClass(targetElement(entry));
          continue;
        }
        const entryIsLowerThanPrevious = entry.target.offsetTop >= this._previousScrollData.visibleEntryTop;
        if (userScrollsDown && entryIsLowerThanPrevious) {
          activate(entry);
          if (!parentScrollTop) {
            return;
          }
          continue;
        }
        if (!userScrollsDown && !entryIsLowerThanPrevious) {
          activate(entry);
        }
      }
    }
    _initializeTargetsAndObservables() {
      this._targetLinks = /* @__PURE__ */ new Map();
      this._observableSections = /* @__PURE__ */ new Map();
      const targetLinks = SelectorEngine.find(SELECTOR_TARGET_LINKS, this._config.target);
      for (const anchor of targetLinks) {
        if (!anchor.hash || isDisabled(anchor)) {
          continue;
        }
        const observableSection = SelectorEngine.findOne(decodeURI(anchor.hash), this._element);
        if (isVisible(observableSection)) {
          this._targetLinks.set(decodeURI(anchor.hash), anchor);
          this._observableSections.set(anchor.hash, observableSection);
        }
      }
    }
    _process(target) {
      if (this._activeTarget === target) {
        return;
      }
      this._clearActiveClass(this._config.target);
      this._activeTarget = target;
      target.classList.add(CLASS_NAME_ACTIVE$1);
      this._activateParents(target);
      EventHandler.trigger(this._element, EVENT_ACTIVATE, {
        relatedTarget: target
      });
    }
    _activateParents(target) {
      if (target.classList.contains(CLASS_NAME_DROPDOWN_ITEM)) {
        SelectorEngine.findOne(SELECTOR_DROPDOWN_TOGGLE$1, target.closest(SELECTOR_DROPDOWN)).classList.add(CLASS_NAME_ACTIVE$1);
        return;
      }
      for (const listGroup of SelectorEngine.parents(target, SELECTOR_NAV_LIST_GROUP)) {
        for (const item of SelectorEngine.prev(listGroup, SELECTOR_LINK_ITEMS)) {
          item.classList.add(CLASS_NAME_ACTIVE$1);
        }
      }
    }
    _clearActiveClass(parent) {
      parent.classList.remove(CLASS_NAME_ACTIVE$1);
      const activeNodes = SelectorEngine.find(`${SELECTOR_TARGET_LINKS}.${CLASS_NAME_ACTIVE$1}`, parent);
      for (const node of activeNodes) {
        node.classList.remove(CLASS_NAME_ACTIVE$1);
      }
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _ScrollSpy.getOrCreateInstance(this, config);
        if (typeof config !== "string") {
          return;
        }
        if (data[config] === void 0 || config.startsWith("_") || config === "constructor") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config]();
      });
    }
  };
  EventHandler.on(window, EVENT_LOAD_DATA_API$1, () => {
    for (const spy of SelectorEngine.find(SELECTOR_DATA_SPY)) {
      ScrollSpy.getOrCreateInstance(spy);
    }
  });
  defineJQueryPlugin(ScrollSpy);
  var NAME$1 = "tab";
  var DATA_KEY$1 = "bs.tab";
  var EVENT_KEY$1 = `.${DATA_KEY$1}`;
  var EVENT_HIDE$1 = `hide${EVENT_KEY$1}`;
  var EVENT_HIDDEN$1 = `hidden${EVENT_KEY$1}`;
  var EVENT_SHOW$1 = `show${EVENT_KEY$1}`;
  var EVENT_SHOWN$1 = `shown${EVENT_KEY$1}`;
  var EVENT_CLICK_DATA_API = `click${EVENT_KEY$1}`;
  var EVENT_KEYDOWN = `keydown${EVENT_KEY$1}`;
  var EVENT_LOAD_DATA_API = `load${EVENT_KEY$1}`;
  var ARROW_LEFT_KEY = "ArrowLeft";
  var ARROW_RIGHT_KEY = "ArrowRight";
  var ARROW_UP_KEY = "ArrowUp";
  var ARROW_DOWN_KEY = "ArrowDown";
  var HOME_KEY = "Home";
  var END_KEY = "End";
  var CLASS_NAME_ACTIVE = "active";
  var CLASS_NAME_FADE$1 = "fade";
  var CLASS_NAME_SHOW$1 = "show";
  var CLASS_DROPDOWN = "dropdown";
  var SELECTOR_DROPDOWN_TOGGLE = ".dropdown-toggle";
  var SELECTOR_DROPDOWN_MENU = ".dropdown-menu";
  var NOT_SELECTOR_DROPDOWN_TOGGLE = `:not(${SELECTOR_DROPDOWN_TOGGLE})`;
  var SELECTOR_TAB_PANEL = '.list-group, .nav, [role="tablist"]';
  var SELECTOR_OUTER = ".nav-item, .list-group-item";
  var SELECTOR_INNER = `.nav-link${NOT_SELECTOR_DROPDOWN_TOGGLE}, .list-group-item${NOT_SELECTOR_DROPDOWN_TOGGLE}, [role="tab"]${NOT_SELECTOR_DROPDOWN_TOGGLE}`;
  var SELECTOR_DATA_TOGGLE = '[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]';
  var SELECTOR_INNER_ELEM = `${SELECTOR_INNER}, ${SELECTOR_DATA_TOGGLE}`;
  var SELECTOR_DATA_TOGGLE_ACTIVE = `.${CLASS_NAME_ACTIVE}[data-bs-toggle="tab"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="pill"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="list"]`;
  var Tab = class _Tab extends BaseComponent {
    constructor(element) {
      super(element);
      this._parent = this._element.closest(SELECTOR_TAB_PANEL);
      if (!this._parent) {
        return;
      }
      this._setInitialAttributes(this._parent, this._getChildren());
      EventHandler.on(this._element, EVENT_KEYDOWN, (event) => this._keydown(event));
    }
    // Getters
    static get NAME() {
      return NAME$1;
    }
    // Public
    show() {
      const innerElem = this._element;
      if (this._elemIsActive(innerElem)) {
        return;
      }
      const active = this._getActiveElem();
      const hideEvent = active ? EventHandler.trigger(active, EVENT_HIDE$1, {
        relatedTarget: innerElem
      }) : null;
      const showEvent = EventHandler.trigger(innerElem, EVENT_SHOW$1, {
        relatedTarget: active
      });
      if (showEvent.defaultPrevented || hideEvent && hideEvent.defaultPrevented) {
        return;
      }
      this._deactivate(active, innerElem);
      this._activate(innerElem, active);
    }
    // Private
    _activate(element, relatedElem) {
      if (!element) {
        return;
      }
      element.classList.add(CLASS_NAME_ACTIVE);
      this._activate(SelectorEngine.getElementFromSelector(element));
      const complete = () => {
        if (element.getAttribute("role") !== "tab") {
          element.classList.add(CLASS_NAME_SHOW$1);
          return;
        }
        element.removeAttribute("tabindex");
        element.setAttribute("aria-selected", true);
        this._toggleDropDown(element, true);
        EventHandler.trigger(element, EVENT_SHOWN$1, {
          relatedTarget: relatedElem
        });
      };
      this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1));
    }
    _deactivate(element, relatedElem) {
      if (!element) {
        return;
      }
      element.classList.remove(CLASS_NAME_ACTIVE);
      element.blur();
      this._deactivate(SelectorEngine.getElementFromSelector(element));
      const complete = () => {
        if (element.getAttribute("role") !== "tab") {
          element.classList.remove(CLASS_NAME_SHOW$1);
          return;
        }
        element.setAttribute("aria-selected", false);
        element.setAttribute("tabindex", "-1");
        this._toggleDropDown(element, false);
        EventHandler.trigger(element, EVENT_HIDDEN$1, {
          relatedTarget: relatedElem
        });
      };
      this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1));
    }
    _keydown(event) {
      if (![ARROW_LEFT_KEY, ARROW_RIGHT_KEY, ARROW_UP_KEY, ARROW_DOWN_KEY, HOME_KEY, END_KEY].includes(event.key)) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const children = this._getChildren().filter((element) => !isDisabled(element));
      let nextActiveElement;
      if ([HOME_KEY, END_KEY].includes(event.key)) {
        nextActiveElement = children[event.key === HOME_KEY ? 0 : children.length - 1];
      } else {
        const isNext = [ARROW_RIGHT_KEY, ARROW_DOWN_KEY].includes(event.key);
        nextActiveElement = getNextActiveElement(children, event.target, isNext, true);
      }
      if (nextActiveElement) {
        nextActiveElement.focus({
          preventScroll: true
        });
        _Tab.getOrCreateInstance(nextActiveElement).show();
      }
    }
    _getChildren() {
      return SelectorEngine.find(SELECTOR_INNER_ELEM, this._parent);
    }
    _getActiveElem() {
      return this._getChildren().find((child) => this._elemIsActive(child)) || null;
    }
    _setInitialAttributes(parent, children) {
      this._setAttributeIfNotExists(parent, "role", "tablist");
      for (const child of children) {
        this._setInitialAttributesOnChild(child);
      }
    }
    _setInitialAttributesOnChild(child) {
      child = this._getInnerElement(child);
      const isActive = this._elemIsActive(child);
      const outerElem = this._getOuterElement(child);
      child.setAttribute("aria-selected", isActive);
      if (outerElem !== child) {
        this._setAttributeIfNotExists(outerElem, "role", "presentation");
      }
      if (!isActive) {
        child.setAttribute("tabindex", "-1");
      }
      this._setAttributeIfNotExists(child, "role", "tab");
      this._setInitialAttributesOnTargetPanel(child);
    }
    _setInitialAttributesOnTargetPanel(child) {
      const target = SelectorEngine.getElementFromSelector(child);
      if (!target) {
        return;
      }
      this._setAttributeIfNotExists(target, "role", "tabpanel");
      if (child.id) {
        this._setAttributeIfNotExists(target, "aria-labelledby", `${child.id}`);
      }
    }
    _toggleDropDown(element, open) {
      const outerElem = this._getOuterElement(element);
      if (!outerElem.classList.contains(CLASS_DROPDOWN)) {
        return;
      }
      const toggle = (selector, className) => {
        const element2 = SelectorEngine.findOne(selector, outerElem);
        if (element2) {
          element2.classList.toggle(className, open);
        }
      };
      toggle(SELECTOR_DROPDOWN_TOGGLE, CLASS_NAME_ACTIVE);
      toggle(SELECTOR_DROPDOWN_MENU, CLASS_NAME_SHOW$1);
      outerElem.setAttribute("aria-expanded", open);
    }
    _setAttributeIfNotExists(element, attribute, value) {
      if (!element.hasAttribute(attribute)) {
        element.setAttribute(attribute, value);
      }
    }
    _elemIsActive(elem) {
      return elem.classList.contains(CLASS_NAME_ACTIVE);
    }
    // Try to get the inner element (usually the .nav-link)
    _getInnerElement(elem) {
      return elem.matches(SELECTOR_INNER_ELEM) ? elem : SelectorEngine.findOne(SELECTOR_INNER_ELEM, elem);
    }
    // Try to get the outer element (usually the .nav-item)
    _getOuterElement(elem) {
      return elem.closest(SELECTOR_OUTER) || elem;
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Tab.getOrCreateInstance(this);
        if (typeof config !== "string") {
          return;
        }
        if (data[config] === void 0 || config.startsWith("_") || config === "constructor") {
          throw new TypeError(`No method named "${config}"`);
        }
        data[config]();
      });
    }
  };
  EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, function(event) {
    if (["A", "AREA"].includes(this.tagName)) {
      event.preventDefault();
    }
    if (isDisabled(this)) {
      return;
    }
    Tab.getOrCreateInstance(this).show();
  });
  EventHandler.on(window, EVENT_LOAD_DATA_API, () => {
    for (const element of SelectorEngine.find(SELECTOR_DATA_TOGGLE_ACTIVE)) {
      Tab.getOrCreateInstance(element);
    }
  });
  defineJQueryPlugin(Tab);
  var NAME = "toast";
  var DATA_KEY = "bs.toast";
  var EVENT_KEY = `.${DATA_KEY}`;
  var EVENT_MOUSEOVER = `mouseover${EVENT_KEY}`;
  var EVENT_MOUSEOUT = `mouseout${EVENT_KEY}`;
  var EVENT_FOCUSIN = `focusin${EVENT_KEY}`;
  var EVENT_FOCUSOUT = `focusout${EVENT_KEY}`;
  var EVENT_HIDE = `hide${EVENT_KEY}`;
  var EVENT_HIDDEN = `hidden${EVENT_KEY}`;
  var EVENT_SHOW = `show${EVENT_KEY}`;
  var EVENT_SHOWN = `shown${EVENT_KEY}`;
  var CLASS_NAME_FADE = "fade";
  var CLASS_NAME_HIDE = "hide";
  var CLASS_NAME_SHOW = "show";
  var CLASS_NAME_SHOWING = "showing";
  var DefaultType = {
    animation: "boolean",
    autohide: "boolean",
    delay: "number"
  };
  var Default = {
    animation: true,
    autohide: true,
    delay: 5e3
  };
  var Toast = class _Toast extends BaseComponent {
    constructor(element, config) {
      super(element, config);
      this._timeout = null;
      this._hasMouseInteraction = false;
      this._hasKeyboardInteraction = false;
      this._setListeners();
    }
    // Getters
    static get Default() {
      return Default;
    }
    static get DefaultType() {
      return DefaultType;
    }
    static get NAME() {
      return NAME;
    }
    // Public
    show() {
      const showEvent = EventHandler.trigger(this._element, EVENT_SHOW);
      if (showEvent.defaultPrevented) {
        return;
      }
      this._clearTimeout();
      if (this._config.animation) {
        this._element.classList.add(CLASS_NAME_FADE);
      }
      const complete = () => {
        this._element.classList.remove(CLASS_NAME_SHOWING);
        EventHandler.trigger(this._element, EVENT_SHOWN);
        this._maybeScheduleHide();
      };
      this._element.classList.remove(CLASS_NAME_HIDE);
      reflow(this._element);
      this._element.classList.add(CLASS_NAME_SHOW, CLASS_NAME_SHOWING);
      this._queueCallback(complete, this._element, this._config.animation);
    }
    hide() {
      if (!this.isShown()) {
        return;
      }
      const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE);
      if (hideEvent.defaultPrevented) {
        return;
      }
      const complete = () => {
        this._element.classList.add(CLASS_NAME_HIDE);
        this._element.classList.remove(CLASS_NAME_SHOWING, CLASS_NAME_SHOW);
        EventHandler.trigger(this._element, EVENT_HIDDEN);
      };
      this._element.classList.add(CLASS_NAME_SHOWING);
      this._queueCallback(complete, this._element, this._config.animation);
    }
    dispose() {
      this._clearTimeout();
      if (this.isShown()) {
        this._element.classList.remove(CLASS_NAME_SHOW);
      }
      super.dispose();
    }
    isShown() {
      return this._element.classList.contains(CLASS_NAME_SHOW);
    }
    // Private
    _maybeScheduleHide() {
      if (!this._config.autohide) {
        return;
      }
      if (this._hasMouseInteraction || this._hasKeyboardInteraction) {
        return;
      }
      this._timeout = setTimeout(() => {
        this.hide();
      }, this._config.delay);
    }
    _onInteraction(event, isInteracting) {
      switch (event.type) {
        case "mouseover":
        case "mouseout": {
          this._hasMouseInteraction = isInteracting;
          break;
        }
        case "focusin":
        case "focusout": {
          this._hasKeyboardInteraction = isInteracting;
          break;
        }
      }
      if (isInteracting) {
        this._clearTimeout();
        return;
      }
      const nextElement = event.relatedTarget;
      if (this._element === nextElement || this._element.contains(nextElement)) {
        return;
      }
      this._maybeScheduleHide();
    }
    _setListeners() {
      EventHandler.on(this._element, EVENT_MOUSEOVER, (event) => this._onInteraction(event, true));
      EventHandler.on(this._element, EVENT_MOUSEOUT, (event) => this._onInteraction(event, false));
      EventHandler.on(this._element, EVENT_FOCUSIN, (event) => this._onInteraction(event, true));
      EventHandler.on(this._element, EVENT_FOCUSOUT, (event) => this._onInteraction(event, false));
    }
    _clearTimeout() {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    // Static
    static jQueryInterface(config) {
      return this.each(function() {
        const data = _Toast.getOrCreateInstance(this, config);
        if (typeof config === "string") {
          if (typeof data[config] === "undefined") {
            throw new TypeError(`No method named "${config}"`);
          }
          data[config](this);
        }
      });
    }
  };
  enableDismissTrigger(Toast);
  defineJQueryPlugin(Toast);

  // node_modules/ical.js/dist/ical.js
  var Binary = class _Binary {
    /**
     * Creates a binary value from the given string.
     *
     * @param {String} aString        The binary value string
     * @return {Binary}               The binary value instance
     */
    static fromString(aString) {
      return new _Binary(aString);
    }
    /**
     * Creates a new ICAL.Binary instance
     *
     * @param {String} aValue     The binary data for this value
     */
    constructor(aValue) {
      this.value = aValue;
    }
    /**
     * The type name, to be used in the jCal object.
     * @default "binary"
     * @constant
     */
    icaltype = "binary";
    /**
     * Base64 decode the current value
     *
     * @return {String}         The base64-decoded value
     */
    decodeValue() {
      return this._b64_decode(this.value);
    }
    /**
     * Encodes the passed parameter with base64 and sets the internal
     * value to the result.
     *
     * @param {String} aValue      The raw binary value to encode
     */
    setEncodedValue(aValue) {
      this.value = this._b64_encode(aValue);
    }
    _b64_encode(data) {
      let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
      if (!data) {
        return data;
      }
      do {
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);
        bits = o1 << 16 | o2 << 8 | o3;
        h1 = bits >> 18 & 63;
        h2 = bits >> 12 & 63;
        h3 = bits >> 6 & 63;
        h4 = bits & 63;
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
      } while (i < data.length);
      enc = tmp_arr.join("");
      let r = data.length % 3;
      return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
    }
    _b64_decode(data) {
      let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
      if (!data) {
        return data;
      }
      data += "";
      do {
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));
        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
        o1 = bits >> 16 & 255;
        o2 = bits >> 8 & 255;
        o3 = bits & 255;
        if (h3 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
          tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
      } while (i < data.length);
      dec = tmp_arr.join("");
      return dec;
    }
    /**
     * The string representation of this value
     * @return {String}
     */
    toString() {
      return this.value;
    }
  };
  var DURATION_LETTERS = /([PDWHMTS]{1,1})/;
  var DATA_PROPS_TO_COPY = ["weeks", "days", "hours", "minutes", "seconds", "isNegative"];
  var Duration = class _Duration {
    /**
     * Returns a new ICAL.Duration instance from the passed seconds value.
     *
     * @param {Number} aSeconds       The seconds to create the instance from
     * @return {Duration}             The newly created duration instance
     */
    static fromSeconds(aSeconds) {
      return new _Duration().fromSeconds(aSeconds);
    }
    /**
     * Checks if the given string is an iCalendar duration value.
     *
     * @param {String} value      The raw ical value
     * @return {Boolean}          True, if the given value is of the
     *                              duration ical type
     */
    static isValueString(string) {
      return string[0] === "P" || string[1] === "P";
    }
    /**
     * Creates a new {@link ICAL.Duration} instance from the passed string.
     *
     * @param {String} aStr       The string to parse
     * @return {Duration}         The created duration instance
     */
    static fromString(aStr) {
      let pos = 0;
      let dict = /* @__PURE__ */ Object.create(null);
      let chunks = 0;
      while ((pos = aStr.search(DURATION_LETTERS)) !== -1) {
        let type = aStr[pos];
        let numeric = aStr.slice(0, Math.max(0, pos));
        aStr = aStr.slice(pos + 1);
        chunks += parseDurationChunk(type, numeric, dict);
      }
      if (chunks < 2) {
        throw new Error(
          'invalid duration value: Not enough duration components in "' + aStr + '"'
        );
      }
      return new _Duration(dict);
    }
    /**
     * Creates a new ICAL.Duration instance from the given data object.
     *
     * @param {Object} aData                An object with members of the duration
     * @param {Number=} aData.weeks         Duration in weeks
     * @param {Number=} aData.days          Duration in days
     * @param {Number=} aData.hours         Duration in hours
     * @param {Number=} aData.minutes       Duration in minutes
     * @param {Number=} aData.seconds       Duration in seconds
     * @param {Boolean=} aData.isNegative   If true, the duration is negative
     * @return {Duration}                   The createad duration instance
     */
    static fromData(aData) {
      return new _Duration(aData);
    }
    /**
     * Creates a new ICAL.Duration instance.
     *
     * @param {Object} data                 An object with members of the duration
     * @param {Number=} data.weeks          Duration in weeks
     * @param {Number=} data.days           Duration in days
     * @param {Number=} data.hours          Duration in hours
     * @param {Number=} data.minutes        Duration in minutes
     * @param {Number=} data.seconds        Duration in seconds
     * @param {Boolean=} data.isNegative    If true, the duration is negative
     */
    constructor(data) {
      this.wrappedJSObject = this;
      this.fromData(data);
    }
    /**
     * The weeks in this duration
     * @type {Number}
     * @default 0
     */
    weeks = 0;
    /**
     * The days in this duration
     * @type {Number}
     * @default 0
     */
    days = 0;
    /**
     * The days in this duration
     * @type {Number}
     * @default 0
     */
    hours = 0;
    /**
     * The minutes in this duration
     * @type {Number}
     * @default 0
     */
    minutes = 0;
    /**
     * The seconds in this duration
     * @type {Number}
     * @default 0
     */
    seconds = 0;
    /**
     * The seconds in this duration
     * @type {Boolean}
     * @default false
     */
    isNegative = false;
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icalduration"
     */
    icalclass = "icalduration";
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "duration"
     */
    icaltype = "duration";
    /**
     * Returns a clone of the duration object.
     *
     * @return {Duration}      The cloned object
     */
    clone() {
      return _Duration.fromData(this);
    }
    /**
     * The duration value expressed as a number of seconds.
     *
     * @return {Number}             The duration value in seconds
     */
    toSeconds() {
      let seconds = this.seconds + 60 * this.minutes + 3600 * this.hours + 86400 * this.days + 7 * 86400 * this.weeks;
      return this.isNegative ? -seconds : seconds;
    }
    /**
     * Reads the passed seconds value into this duration object. Afterwards,
     * members like {@link ICAL.Duration#days days} and {@link ICAL.Duration#weeks weeks} will be set up
     * accordingly.
     *
     * @param {Number} aSeconds     The duration value in seconds
     * @return {Duration}           Returns this instance
     */
    fromSeconds(aSeconds) {
      let secs = Math.abs(aSeconds);
      this.isNegative = aSeconds < 0;
      this.days = trunc(secs / 86400);
      if (this.days % 7 == 0) {
        this.weeks = this.days / 7;
        this.days = 0;
      } else {
        this.weeks = 0;
      }
      secs -= (this.days + 7 * this.weeks) * 86400;
      this.hours = trunc(secs / 3600);
      secs -= this.hours * 3600;
      this.minutes = trunc(secs / 60);
      secs -= this.minutes * 60;
      this.seconds = secs;
      return this;
    }
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param {Object} aData                An object with members of the duration
     * @param {Number=} aData.weeks         Duration in weeks
     * @param {Number=} aData.days          Duration in days
     * @param {Number=} aData.hours         Duration in hours
     * @param {Number=} aData.minutes       Duration in minutes
     * @param {Number=} aData.seconds       Duration in seconds
     * @param {Boolean=} aData.isNegative   If true, the duration is negative
     */
    fromData(aData) {
      for (let prop of DATA_PROPS_TO_COPY) {
        if (aData && prop in aData) {
          this[prop] = aData[prop];
        } else {
          this[prop] = 0;
        }
      }
    }
    /**
     * Resets the duration instance to the default values, i.e. PT0S
     */
    reset() {
      this.isNegative = false;
      this.weeks = 0;
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
    }
    /**
     * Compares the duration instance with another one.
     *
     * @param {Duration} aOther             The instance to compare with
     * @return {Number}                     -1, 0 or 1 for less/equal/greater
     */
    compare(aOther) {
      let thisSeconds = this.toSeconds();
      let otherSeconds = aOther.toSeconds();
      return (thisSeconds > otherSeconds) - (thisSeconds < otherSeconds);
    }
    /**
     * Normalizes the duration instance. For example, a duration with a value
     * of 61 seconds will be normalized to 1 minute and 1 second.
     */
    normalize() {
      this.fromSeconds(this.toSeconds());
    }
    /**
     * The string representation of this duration.
     * @return {String}
     */
    toString() {
      if (this.toSeconds() == 0) {
        return "PT0S";
      } else {
        let str = "";
        if (this.isNegative)
          str += "-";
        str += "P";
        let hasWeeks = false;
        if (this.weeks) {
          if (this.days || this.hours || this.minutes || this.seconds) {
            str += this.weeks * 7 + this.days + "D";
          } else {
            str += this.weeks + "W";
            hasWeeks = true;
          }
        } else if (this.days) {
          str += this.days + "D";
        }
        if (!hasWeeks) {
          if (this.hours || this.minutes || this.seconds) {
            str += "T";
            if (this.hours) {
              str += this.hours + "H";
            }
            if (this.minutes) {
              str += this.minutes + "M";
            }
            if (this.seconds) {
              str += this.seconds + "S";
            }
          }
        }
        return str;
      }
    }
    /**
     * The iCalendar string representation of this duration.
     * @return {String}
     */
    toICALString() {
      return this.toString();
    }
  };
  function parseDurationChunk(letter, number, object) {
    let type;
    switch (letter) {
      case "P":
        if (number && number === "-") {
          object.isNegative = true;
        } else {
          object.isNegative = false;
        }
        break;
      case "D":
        type = "days";
        break;
      case "W":
        type = "weeks";
        break;
      case "H":
        type = "hours";
        break;
      case "M":
        type = "minutes";
        break;
      case "S":
        type = "seconds";
        break;
      default:
        return 0;
    }
    if (type) {
      if (!number && number !== 0) {
        throw new Error(
          'invalid duration value: Missing number before "' + letter + '"'
        );
      }
      let num = parseInt(number, 10);
      if (isStrictlyNaN(num)) {
        throw new Error(
          'invalid duration value: Invalid number "' + number + '" before "' + letter + '"'
        );
      }
      object[type] = num;
    }
    return 1;
  }
  var Period = class _Period {
    /**
     * Creates a new {@link ICAL.Period} instance from the passed string.
     *
     * @param {String} str            The string to parse
     * @param {Property} prop         The property this period will be on
     * @return {Period}               The created period instance
     */
    static fromString(str, prop) {
      let parts = str.split("/");
      if (parts.length !== 2) {
        throw new Error(
          'Invalid string value: "' + str + '" must contain a "/" char.'
        );
      }
      let options = {
        start: Time.fromDateTimeString(parts[0], prop)
      };
      let end2 = parts[1];
      if (Duration.isValueString(end2)) {
        options.duration = Duration.fromString(end2);
      } else {
        options.end = Time.fromDateTimeString(end2, prop);
      }
      return new _Period(options);
    }
    /**
     * Creates a new {@link ICAL.Period} instance from the given data object.
     * The passed data object cannot contain both and end date and a duration.
     *
     * @param {Object} aData                  An object with members of the period
     * @param {Time=} aData.start             The start of the period
     * @param {Time=} aData.end               The end of the period
     * @param {Duration=} aData.duration      The duration of the period
     * @return {Period}                       The period instance
     */
    static fromData(aData) {
      return new _Period(aData);
    }
    /**
     * Returns a new period instance from the given jCal data array. The first
     * member is always the start date string, the second member is either a
     * duration or end date string.
     *
     * @param {jCalComponent} aData           The jCal data array
     * @param {Property} aProp                The property this jCal data is on
     * @param {Boolean} aLenient              If true, data value can be both date and date-time
     * @return {Period}                       The period instance
     */
    static fromJSON(aData, aProp, aLenient) {
      function fromDateOrDateTimeString(aValue, dateProp) {
        if (aLenient) {
          return Time.fromString(aValue, dateProp);
        } else {
          return Time.fromDateTimeString(aValue, dateProp);
        }
      }
      if (Duration.isValueString(aData[1])) {
        return _Period.fromData({
          start: fromDateOrDateTimeString(aData[0], aProp),
          duration: Duration.fromString(aData[1])
        });
      } else {
        return _Period.fromData({
          start: fromDateOrDateTimeString(aData[0], aProp),
          end: fromDateOrDateTimeString(aData[1], aProp)
        });
      }
    }
    /**
     * Creates a new ICAL.Period instance. The passed data object cannot contain both and end date and
     * a duration.
     *
     * @param {Object} aData                  An object with members of the period
     * @param {Time=} aData.start             The start of the period
     * @param {Time=} aData.end               The end of the period
     * @param {Duration=} aData.duration      The duration of the period
     */
    constructor(aData) {
      this.wrappedJSObject = this;
      if (aData && "start" in aData) {
        if (aData.start && !(aData.start instanceof Time)) {
          throw new TypeError(".start must be an instance of ICAL.Time");
        }
        this.start = aData.start;
      }
      if (aData && aData.end && aData.duration) {
        throw new Error("cannot accept both end and duration");
      }
      if (aData && "end" in aData) {
        if (aData.end && !(aData.end instanceof Time)) {
          throw new TypeError(".end must be an instance of ICAL.Time");
        }
        this.end = aData.end;
      }
      if (aData && "duration" in aData) {
        if (aData.duration && !(aData.duration instanceof Duration)) {
          throw new TypeError(".duration must be an instance of ICAL.Duration");
        }
        this.duration = aData.duration;
      }
    }
    /**
     * The start of the period
     * @type {Time}
     */
    start = null;
    /**
     * The end of the period
     * @type {Time}
     */
    end = null;
    /**
     * The duration of the period
     * @type {Duration}
     */
    duration = null;
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icalperiod"
     */
    icalclass = "icalperiod";
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "period"
     */
    icaltype = "period";
    /**
     * Returns a clone of the duration object.
     *
     * @return {Period}      The cloned object
     */
    clone() {
      return _Period.fromData({
        start: this.start ? this.start.clone() : null,
        end: this.end ? this.end.clone() : null,
        duration: this.duration ? this.duration.clone() : null
      });
    }
    /**
     * Calculates the duration of the period, either directly or by subtracting
     * start from end date.
     *
     * @return {Duration}      The calculated duration
     */
    getDuration() {
      if (this.duration) {
        return this.duration;
      } else {
        return this.end.subtractDate(this.start);
      }
    }
    /**
     * Calculates the end date of the period, either directly or by adding
     * duration to start date.
     *
     * @return {Time}          The calculated end date
     */
    getEnd() {
      if (this.end) {
        return this.end;
      } else {
        let end2 = this.start.clone();
        end2.addDuration(this.duration);
        return end2;
      }
    }
    /**
     * Compare this period with a date or other period. To maintain the logic where a.compare(b)
     * returns 1 when a > b, this function will return 1 when the period is after the date, 0 when the
     * date is within the period, and -1 when the period is before the date. When comparing two
     * periods, as soon as they overlap in any way this will return 0.
     *
     * @param {ICAL.Time|ICAL.Period} dt    The date or other period to compare with
     */
    compare(dt) {
      if (dt.compare(this.start) < 0) {
        return 1;
      } else if (dt.compare(this.getEnd()) > 0) {
        return -1;
      } else {
        return 0;
      }
    }
    /**
     * The string representation of this period.
     * @return {String}
     */
    toString() {
      return this.start + "/" + (this.end || this.duration);
    }
    /**
     * The jCal representation of this period type.
     * @return {Object}
     */
    toJSON() {
      return [this.start.toString(), (this.end || this.duration).toString()];
    }
    /**
     * The iCalendar string representation of this period.
     * @return {String}
     */
    toICALString() {
      return this.start.toICALString() + "/" + (this.end || this.duration).toICALString();
    }
  };
  var Time = class _Time {
    static _dowCache = {};
    static _wnCache = {};
    /**
     * Returns the days in the given month
     *
     * @param {Number} month      The month to check
     * @param {Number} year       The year to check
     * @return {Number}           The number of days in the month
     */
    static daysInMonth(month, year) {
      let _daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let days = 30;
      if (month < 1 || month > 12)
        return days;
      days = _daysInMonth[month];
      if (month == 2) {
        days += _Time.isLeapYear(year);
      }
      return days;
    }
    /**
     * Checks if the year is a leap year
     *
     * @param {Number} year       The year to check
     * @return {Boolean}          True, if the year is a leap year
     */
    static isLeapYear(year) {
      if (year <= 1752) {
        return year % 4 == 0;
      } else {
        return year % 4 == 0 && year % 100 != 0 || year % 400 == 0;
      }
    }
    /**
     * Create a new ICAL.Time from the day of year and year. The date is returned
     * in floating timezone.
     *
     * @param {Number} aDayOfYear     The day of year
     * @param {Number} aYear          The year to create the instance in
     * @return {Time}                 The created instance with the calculated date
     */
    static fromDayOfYear(aDayOfYear, aYear) {
      let year = aYear;
      let doy = aDayOfYear;
      let tt = new _Time();
      tt.auto_normalize = false;
      let is_leap = _Time.isLeapYear(year) ? 1 : 0;
      if (doy < 1) {
        year--;
        is_leap = _Time.isLeapYear(year) ? 1 : 0;
        doy += _Time.daysInYearPassedMonth[is_leap][12];
        return _Time.fromDayOfYear(doy, year);
      } else if (doy > _Time.daysInYearPassedMonth[is_leap][12]) {
        is_leap = _Time.isLeapYear(year) ? 1 : 0;
        doy -= _Time.daysInYearPassedMonth[is_leap][12];
        year++;
        return _Time.fromDayOfYear(doy, year);
      }
      tt.year = year;
      tt.isDate = true;
      for (let month = 11; month >= 0; month--) {
        if (doy > _Time.daysInYearPassedMonth[is_leap][month]) {
          tt.month = month + 1;
          tt.day = doy - _Time.daysInYearPassedMonth[is_leap][month];
          break;
        }
      }
      tt.auto_normalize = true;
      return tt;
    }
    /**
     * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
     *
     * @deprecated                Use {@link ICAL.Time.fromDateString} instead
     * @param {String} str        The string to create from
     * @return {Time}             The date/time instance
     */
    static fromStringv2(str) {
      return new _Time({
        year: parseInt(str.slice(0, 4), 10),
        month: parseInt(str.slice(5, 7), 10),
        day: parseInt(str.slice(8, 10), 10),
        isDate: true
      });
    }
    /**
     * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
     *
     * @param {String} aValue     The string to create from
     * @return {Time}             The date/time instance
     */
    static fromDateString(aValue) {
      return new _Time({
        year: strictParseInt(aValue.slice(0, 4)),
        month: strictParseInt(aValue.slice(5, 7)),
        day: strictParseInt(aValue.slice(8, 10)),
        isDate: true
      });
    }
    /**
     * Returns a new ICAL.Time instance from a date-time string, e.g
     * 2015-01-02T03:04:05. If a property is specified, the timezone is set up
     * from the property's TZID parameter.
     *
     * @param {String} aValue         The string to create from
     * @param {Property=} prop        The property the date belongs to
     * @return {Time}                 The date/time instance
     */
    static fromDateTimeString(aValue, prop) {
      if (aValue.length < 19) {
        throw new Error(
          'invalid date-time value: "' + aValue + '"'
        );
      }
      let zone;
      let zoneId;
      if (aValue.slice(-1) === "Z") {
        zone = Timezone.utcTimezone;
      } else if (prop) {
        zoneId = prop.getParameter("tzid");
        if (prop.parent) {
          if (prop.parent.name === "standard" || prop.parent.name === "daylight") {
            zone = Timezone.localTimezone;
          } else if (zoneId) {
            zone = prop.parent.getTimeZoneByID(zoneId);
          }
        }
      }
      const timeData = {
        year: strictParseInt(aValue.slice(0, 4)),
        month: strictParseInt(aValue.slice(5, 7)),
        day: strictParseInt(aValue.slice(8, 10)),
        hour: strictParseInt(aValue.slice(11, 13)),
        minute: strictParseInt(aValue.slice(14, 16)),
        second: strictParseInt(aValue.slice(17, 19))
      };
      if (zoneId && !zone) {
        timeData.timezone = zoneId;
      }
      return new _Time(timeData, zone);
    }
    /**
     * Returns a new ICAL.Time instance from a date or date-time string,
     *
     * @param {String} aValue         The string to create from
     * @param {Property=} prop        The property the date belongs to
     * @return {Time}                 The date/time instance
     */
    static fromString(aValue, aProperty) {
      if (aValue.length > 10) {
        return _Time.fromDateTimeString(aValue, aProperty);
      } else {
        return _Time.fromDateString(aValue);
      }
    }
    /**
     * Creates a new ICAL.Time instance from the given Javascript Date.
     *
     * @param {?Date} aDate             The Javascript Date to read, or null to reset
     * @param {Boolean} [useUTC=false]  If true, the UTC values of the date will be used
     */
    static fromJSDate(aDate, useUTC) {
      let tt = new _Time();
      return tt.fromJSDate(aDate, useUTC);
    }
    /**
     * Creates a new ICAL.Time instance from the the passed data object.
     *
     * @param {timeInit} aData          Time initialization
     * @param {Timezone=} aZone         Timezone this position occurs in
     */
    static fromData = function fromData(aData, aZone) {
      let t = new _Time();
      return t.fromData(aData, aZone);
    };
    /**
     * Creates a new ICAL.Time instance from the current moment.
     * The instance is “floating” - has no timezone relation.
     * To create an instance considering the time zone, call
     * ICAL.Time.fromJSDate(new Date(), true)
     * @return {Time}
     */
    static now() {
      return _Time.fromJSDate(/* @__PURE__ */ new Date(), false);
    }
    /**
     * Returns the date on which ISO week number 1 starts.
     *
     * @see Time#weekNumber
     * @param {Number} aYear                  The year to search in
     * @param {weekDay=} aWeekStart           The week start weekday, used for calculation.
     * @return {Time}                         The date on which week number 1 starts
     */
    static weekOneStarts(aYear, aWeekStart) {
      let t = _Time.fromData({
        year: aYear,
        month: 1,
        day: 1,
        isDate: true
      });
      let dow = t.dayOfWeek();
      let wkst = aWeekStart || _Time.DEFAULT_WEEK_START;
      if (dow > _Time.THURSDAY) {
        t.day += 7;
      }
      if (wkst > _Time.THURSDAY) {
        t.day -= 7;
      }
      t.day -= dow - wkst;
      return t;
    }
    /**
     * Get the dominical letter for the given year. Letters range from A - G for
     * common years, and AG to GF for leap years.
     *
     * @param {Number} yr           The year to retrieve the letter for
     * @return {String}             The dominical letter.
     */
    static getDominicalLetter(yr) {
      let LTRS = "GFEDCBA";
      let dom = (yr + (yr / 4 | 0) + (yr / 400 | 0) - (yr / 100 | 0) - 1) % 7;
      let isLeap = _Time.isLeapYear(yr);
      if (isLeap) {
        return LTRS[(dom + 6) % 7] + LTRS[dom];
      } else {
        return LTRS[dom];
      }
    }
    static #epochTime = null;
    /**
     * January 1st, 1970 as an ICAL.Time.
     * @type {Time}
     * @constant
     * @instance
     */
    static get epochTime() {
      if (!this.#epochTime) {
        this.#epochTime = _Time.fromData({
          year: 1970,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          isDate: false,
          timezone: "Z"
        });
      }
      return this.#epochTime;
    }
    static _cmp_attr(a, b, attr) {
      if (a[attr] > b[attr])
        return 1;
      if (a[attr] < b[attr])
        return -1;
      return 0;
    }
    /**
     * The days that have passed in the year after a given month. The array has
     * two members, one being an array of passed days for non-leap years, the
     * other analog for leap years.
     * @example
     * var isLeapYear = ICAL.Time.isLeapYear(year);
     * var passedDays = ICAL.Time.daysInYearPassedMonth[isLeapYear][month];
     * @type {Array.<Array.<Number>>}
     */
    static daysInYearPassedMonth = [
      [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365],
      [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366]
    ];
    static SUNDAY = 1;
    static MONDAY = 2;
    static TUESDAY = 3;
    static WEDNESDAY = 4;
    static THURSDAY = 5;
    static FRIDAY = 6;
    static SATURDAY = 7;
    /**
     * The default weekday for the WKST part.
     * @constant
     * @default ICAL.Time.MONDAY
     */
    static DEFAULT_WEEK_START = 2;
    // MONDAY
    /**
     * Creates a new ICAL.Time instance.
     *
     * @param {timeInit} data           Time initialization
     * @param {Timezone} zone           timezone this position occurs in
     */
    constructor(data, zone) {
      this.wrappedJSObject = this;
      this._time = /* @__PURE__ */ Object.create(null);
      this._time.year = 0;
      this._time.month = 1;
      this._time.day = 1;
      this._time.hour = 0;
      this._time.minute = 0;
      this._time.second = 0;
      this._time.isDate = false;
      this.fromData(data, zone);
    }
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icaltime"
     */
    icalclass = "icaltime";
    _cachedUnixTime = null;
    /**
     * The type name, to be used in the jCal object. This value may change and
     * is strictly defined by the {@link ICAL.Time#isDate isDate} member.
     * @type {String}
     * @default "date-time"
     */
    get icaltype() {
      return this.isDate ? "date" : "date-time";
    }
    /**
     * The timezone for this time.
     * @type {Timezone}
     */
    zone = null;
    /**
     * Internal uses to indicate that a change has been made and the next read
     * operation must attempt to normalize the value (for example changing the
     * day to 33).
     *
     * @type {Boolean}
     * @private
     */
    _pendingNormalization = false;
    /**
     * The year of this date.
     * @type {Number}
     */
    get year() {
      return this._getTimeAttr("year");
    }
    set year(val) {
      this._setTimeAttr("year", val);
    }
    /**
     * The month of this date.
     * @type {Number}
     */
    get month() {
      return this._getTimeAttr("month");
    }
    set month(val) {
      this._setTimeAttr("month", val);
    }
    /**
     * The day of this date.
     * @type {Number}
     */
    get day() {
      return this._getTimeAttr("day");
    }
    set day(val) {
      this._setTimeAttr("day", val);
    }
    /**
     * The hour of this date-time.
     * @type {Number}
     */
    get hour() {
      return this._getTimeAttr("hour");
    }
    set hour(val) {
      this._setTimeAttr("hour", val);
    }
    /**
     * The minute of this date-time.
     * @type {Number}
     */
    get minute() {
      return this._getTimeAttr("minute");
    }
    set minute(val) {
      this._setTimeAttr("minute", val);
    }
    /**
     * The second of this date-time.
     * @type {Number}
     */
    get second() {
      return this._getTimeAttr("second");
    }
    set second(val) {
      this._setTimeAttr("second", val);
    }
    /**
     * If true, the instance represents a date (as opposed to a date-time)
     * @type {Boolean}
     */
    get isDate() {
      return this._getTimeAttr("isDate");
    }
    set isDate(val) {
      this._setTimeAttr("isDate", val);
    }
    /**
     * @private
     * @param {String} attr             Attribute to get (one of: year, month,
     *                                  day, hour, minute, second, isDate)
     * @return {Number|Boolean}         Current value for the attribute
     */
    _getTimeAttr(attr) {
      if (this._pendingNormalization) {
        this._normalize();
        this._pendingNormalization = false;
      }
      return this._time[attr];
    }
    /**
     * @private
     * @param {String} attr             Attribute to set (one of: year, month,
     *                                  day, hour, minute, second, isDate)
     * @param {Number|Boolean} val      New value for the attribute
     */
    _setTimeAttr(attr, val) {
      if (attr === "isDate" && val && !this._time.isDate) {
        this.adjust(0, 0, 0, 0);
      }
      this._cachedUnixTime = null;
      this._pendingNormalization = true;
      this._time[attr] = val;
    }
    /**
     * Returns a clone of the time object.
     *
     * @return {Time}              The cloned object
     */
    clone() {
      return new _Time(this._time, this.zone);
    }
    /**
     * Reset the time instance to epoch time
     */
    reset() {
      this.fromData(_Time.epochTime);
      this.zone = Timezone.utcTimezone;
    }
    /**
     * Reset the time instance to the given date/time values.
     *
     * @param {Number} year             The year to set
     * @param {Number} month            The month to set
     * @param {Number} day              The day to set
     * @param {Number} hour             The hour to set
     * @param {Number} minute           The minute to set
     * @param {Number} second           The second to set
     * @param {Timezone} timezone       The timezone to set
     */
    resetTo(year, month, day, hour, minute, second, timezone) {
      this.fromData({
        year,
        month,
        day,
        hour,
        minute,
        second,
        zone: timezone
      });
    }
    /**
     * Set up the current instance from the Javascript date value.
     *
     * @param {?Date} aDate             The Javascript Date to read, or null to reset
     * @param {Boolean} [useUTC=false]  If true, the UTC values of the date will be used
     */
    fromJSDate(aDate, useUTC) {
      if (!aDate) {
        this.reset();
      } else {
        if (useUTC) {
          this.zone = Timezone.utcTimezone;
          this.year = aDate.getUTCFullYear();
          this.month = aDate.getUTCMonth() + 1;
          this.day = aDate.getUTCDate();
          this.hour = aDate.getUTCHours();
          this.minute = aDate.getUTCMinutes();
          this.second = aDate.getUTCSeconds();
        } else {
          this.zone = Timezone.localTimezone;
          this.year = aDate.getFullYear();
          this.month = aDate.getMonth() + 1;
          this.day = aDate.getDate();
          this.hour = aDate.getHours();
          this.minute = aDate.getMinutes();
          this.second = aDate.getSeconds();
        }
      }
      this._cachedUnixTime = null;
      return this;
    }
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param {timeInit} aData          Time initialization
     * @param {Timezone=} aZone         Timezone this position occurs in
     */
    fromData(aData, aZone) {
      if (aData) {
        for (let [key, value] of Object.entries(aData)) {
          if (key === "icaltype")
            continue;
          this[key] = value;
        }
      }
      if (aZone) {
        this.zone = aZone;
      }
      if (aData && !("isDate" in aData)) {
        this.isDate = !("hour" in aData);
      } else if (aData && "isDate" in aData) {
        this.isDate = aData.isDate;
      }
      if (aData && "timezone" in aData) {
        let zone = TimezoneService.get(
          aData.timezone
        );
        this.zone = zone || Timezone.localTimezone;
      }
      if (aData && "zone" in aData) {
        this.zone = aData.zone;
      }
      if (!this.zone) {
        this.zone = Timezone.localTimezone;
      }
      this._cachedUnixTime = null;
      return this;
    }
    /**
     * Calculate the day of week.
     * @param {weekDay=} aWeekStart
     *        The week start weekday, defaults to SUNDAY
     * @return {weekDay}
     */
    dayOfWeek(aWeekStart) {
      let firstDow = aWeekStart || _Time.SUNDAY;
      let dowCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + firstDow;
      if (dowCacheKey in _Time._dowCache) {
        return _Time._dowCache[dowCacheKey];
      }
      let q = this.day;
      let m = this.month + (this.month < 3 ? 12 : 0);
      let Y = this.year - (this.month < 3 ? 1 : 0);
      let h = q + Y + trunc((m + 1) * 26 / 10) + trunc(Y / 4);
      {
        h += trunc(Y / 100) * 6 + trunc(Y / 400);
      }
      h = (h + 7 - firstDow) % 7 + 1;
      _Time._dowCache[dowCacheKey] = h;
      return h;
    }
    /**
     * Calculate the day of year.
     * @return {Number}
     */
    dayOfYear() {
      let is_leap = _Time.isLeapYear(this.year) ? 1 : 0;
      let diypm = _Time.daysInYearPassedMonth;
      return diypm[is_leap][this.month - 1] + this.day;
    }
    /**
     * Returns a copy of the current date/time, rewound to the start of the
     * week. The resulting ICAL.Time instance is of icaltype date, even if this
     * is a date-time.
     *
     * @param {weekDay=} aWeekStart
     *        The week start weekday, defaults to SUNDAY
     * @return {Time}      The start of the week (cloned)
     */
    startOfWeek(aWeekStart) {
      let firstDow = aWeekStart || _Time.SUNDAY;
      let result = this.clone();
      result.day -= (this.dayOfWeek() + 7 - firstDow) % 7;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    }
    /**
     * Returns a copy of the current date/time, shifted to the end of the week.
     * The resulting ICAL.Time instance is of icaltype date, even if this is a
     * date-time.
     *
     * @param {weekDay=} aWeekStart
     *        The week start weekday, defaults to SUNDAY
     * @return {Time}      The end of the week (cloned)
     */
    endOfWeek(aWeekStart) {
      let firstDow = aWeekStart || _Time.SUNDAY;
      let result = this.clone();
      result.day += (7 - this.dayOfWeek() + firstDow - _Time.SUNDAY) % 7;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    }
    /**
     * Returns a copy of the current date/time, rewound to the start of the
     * month. The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return {Time}      The start of the month (cloned)
     */
    startOfMonth() {
      let result = this.clone();
      result.day = 1;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    }
    /**
     * Returns a copy of the current date/time, shifted to the end of the
     * month.  The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return {Time}      The end of the month (cloned)
     */
    endOfMonth() {
      let result = this.clone();
      result.day = _Time.daysInMonth(result.month, result.year);
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    }
    /**
     * Returns a copy of the current date/time, rewound to the start of the
     * year. The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return {Time}      The start of the year (cloned)
     */
    startOfYear() {
      let result = this.clone();
      result.day = 1;
      result.month = 1;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    }
    /**
     * Returns a copy of the current date/time, shifted to the end of the
     * year.  The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return {Time}      The end of the year (cloned)
     */
    endOfYear() {
      let result = this.clone();
      result.day = 31;
      result.month = 12;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    }
    /**
     * First calculates the start of the week, then returns the day of year for
     * this date. If the day falls into the previous year, the day is zero or negative.
     *
     * @param {weekDay=} aFirstDayOfWeek
     *        The week start weekday, defaults to SUNDAY
     * @return {Number}     The calculated day of year
     */
    startDoyWeek(aFirstDayOfWeek) {
      let firstDow = aFirstDayOfWeek || _Time.SUNDAY;
      let delta = this.dayOfWeek() - firstDow;
      if (delta < 0)
        delta += 7;
      return this.dayOfYear() - delta;
    }
    /**
     * Get the dominical letter for the current year. Letters range from A - G
     * for common years, and AG to GF for leap years.
     *
     * @param {Number} yr           The year to retrieve the letter for
     * @return {String}             The dominical letter.
     */
    getDominicalLetter() {
      return _Time.getDominicalLetter(this.year);
    }
    /**
     * Finds the nthWeekDay relative to the current month (not day).  The
     * returned value is a day relative the month that this month belongs to so
     * 1 would indicate the first of the month and 40 would indicate a day in
     * the following month.
     *
     * @param {Number} aDayOfWeek   Day of the week see the day name constants
     * @param {Number} aPos         Nth occurrence of a given week day values
     *        of 1 and 0 both indicate the first weekday of that type. aPos may
     *        be either positive or negative
     *
     * @return {Number} numeric value indicating a day relative
     *                   to the current month of this time object
     */
    nthWeekDay(aDayOfWeek, aPos) {
      let daysInMonth = _Time.daysInMonth(this.month, this.year);
      let weekday;
      let pos = aPos;
      let start2 = 0;
      let otherDay = this.clone();
      if (pos >= 0) {
        otherDay.day = 1;
        if (pos != 0) {
          pos--;
        }
        start2 = otherDay.day;
        let startDow = otherDay.dayOfWeek();
        let offset2 = aDayOfWeek - startDow;
        if (offset2 < 0)
          offset2 += 7;
        start2 += offset2;
        start2 -= aDayOfWeek;
        weekday = aDayOfWeek;
      } else {
        otherDay.day = daysInMonth;
        let endDow = otherDay.dayOfWeek();
        pos++;
        weekday = endDow - aDayOfWeek;
        if (weekday < 0) {
          weekday += 7;
        }
        weekday = daysInMonth - weekday;
      }
      weekday += pos * 7;
      return start2 + weekday;
    }
    /**
     * Checks if current time is the nth weekday, relative to the current
     * month.  Will always return false when rule resolves outside of current
     * month.
     *
     * @param {weekDay} aDayOfWeek                 Day of week to check
     * @param {Number} aPos                        Relative position
     * @return {Boolean}                           True, if it is the nth weekday
     */
    isNthWeekDay(aDayOfWeek, aPos) {
      let dow = this.dayOfWeek();
      if (aPos === 0 && dow === aDayOfWeek) {
        return true;
      }
      let day = this.nthWeekDay(aDayOfWeek, aPos);
      if (day === this.day) {
        return true;
      }
      return false;
    }
    /**
     * Calculates the ISO 8601 week number. The first week of a year is the
     * week that contains the first Thursday. The year can have 53 weeks, if
     * January 1st is a Friday.
     *
     * Note there are regions where the first week of the year is the one that
     * starts on January 1st, which may offset the week number. Also, if a
     * different week start is specified, this will also affect the week
     * number.
     *
     * @see Time.weekOneStarts
     * @param {weekDay} aWeekStart                  The weekday the week starts with
     * @return {Number}                             The ISO week number
     */
    weekNumber(aWeekStart) {
      let wnCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + aWeekStart;
      if (wnCacheKey in _Time._wnCache) {
        return _Time._wnCache[wnCacheKey];
      }
      let week1;
      let dt = this.clone();
      dt.isDate = true;
      let isoyear = this.year;
      if (dt.month == 12 && dt.day > 25) {
        week1 = _Time.weekOneStarts(isoyear + 1, aWeekStart);
        if (dt.compare(week1) < 0) {
          week1 = _Time.weekOneStarts(isoyear, aWeekStart);
        } else {
          isoyear++;
        }
      } else {
        week1 = _Time.weekOneStarts(isoyear, aWeekStart);
        if (dt.compare(week1) < 0) {
          week1 = _Time.weekOneStarts(--isoyear, aWeekStart);
        }
      }
      let daysBetween = dt.subtractDate(week1).toSeconds() / 86400;
      let answer = trunc(daysBetween / 7) + 1;
      _Time._wnCache[wnCacheKey] = answer;
      return answer;
    }
    /**
     * Adds the duration to the current time. The instance is modified in
     * place.
     *
     * @param {Duration} aDuration         The duration to add
     */
    addDuration(aDuration) {
      let mult = aDuration.isNegative ? -1 : 1;
      let second = this.second;
      let minute = this.minute;
      let hour = this.hour;
      let day = this.day;
      second += mult * aDuration.seconds;
      minute += mult * aDuration.minutes;
      hour += mult * aDuration.hours;
      day += mult * aDuration.days;
      day += mult * 7 * aDuration.weeks;
      this.second = second;
      this.minute = minute;
      this.hour = hour;
      this.day = day;
      this._cachedUnixTime = null;
    }
    /**
     * Subtract the date details (_excluding_ timezone).  Useful for finding
     * the relative difference between two time objects excluding their
     * timezone differences.
     *
     * @param {Time} aDate     The date to subtract
     * @return {Duration}      The difference as a duration
     */
    subtractDate(aDate) {
      let unixTime = this.toUnixTime() + this.utcOffset();
      let other = aDate.toUnixTime() + aDate.utcOffset();
      return Duration.fromSeconds(unixTime - other);
    }
    /**
     * Subtract the date details, taking timezones into account.
     *
     * @param {Time} aDate  The date to subtract
     * @return {Duration}   The difference in duration
     */
    subtractDateTz(aDate) {
      let unixTime = this.toUnixTime();
      let other = aDate.toUnixTime();
      return Duration.fromSeconds(unixTime - other);
    }
    /**
     * Compares the ICAL.Time instance with another one, or a period.
     *
     * @param {ICAL.Time|ICAL.Period} aOther        The instance to compare with
     * @return {Number}                             -1, 0 or 1 for less/equal/greater
     */
    compare(other) {
      if (other instanceof Period) {
        return -1 * other.compare(this);
      } else {
        let a = this.toUnixTime();
        let b = other.toUnixTime();
        if (a > b)
          return 1;
        if (b > a)
          return -1;
        return 0;
      }
    }
    /**
     * Compares only the date part of this instance with another one.
     *
     * @param {Time} other                  The instance to compare with
     * @param {Timezone} tz                 The timezone to compare in
     * @return {Number}                     -1, 0 or 1 for less/equal/greater
     */
    compareDateOnlyTz(other, tz) {
      let a = this.convertToZone(tz);
      let b = other.convertToZone(tz);
      let rc = 0;
      if ((rc = _Time._cmp_attr(a, b, "year")) != 0)
        return rc;
      if ((rc = _Time._cmp_attr(a, b, "month")) != 0)
        return rc;
      if ((rc = _Time._cmp_attr(a, b, "day")) != 0)
        return rc;
      return rc;
    }
    /**
     * Convert the instance into another timezone. The returned ICAL.Time
     * instance is always a copy.
     *
     * @param {Timezone} zone      The zone to convert to
     * @return {Time}              The copy, converted to the zone
     */
    convertToZone(zone) {
      let copy = this.clone();
      let zone_equals = this.zone.tzid == zone.tzid;
      if (!this.isDate && !zone_equals) {
        Timezone.convert_time(copy, this.zone, zone);
      }
      copy.zone = zone;
      return copy;
    }
    /**
     * Calculates the UTC offset of the current date/time in the timezone it is
     * in.
     *
     * @return {Number}     UTC offset in seconds
     */
    utcOffset() {
      if (this.zone == Timezone.localTimezone || this.zone == Timezone.utcTimezone) {
        return 0;
      } else {
        return this.zone.utcOffset(this);
      }
    }
    /**
     * Returns an RFC 5545 compliant ical representation of this object.
     *
     * @return {String} ical date/date-time
     */
    toICALString() {
      let string = this.toString();
      if (string.length > 10) {
        return design.icalendar.value["date-time"].toICAL(string);
      } else {
        return design.icalendar.value.date.toICAL(string);
      }
    }
    /**
     * The string representation of this date/time, in jCal form
     * (including : and - separators).
     * @return {String}
     */
    toString() {
      let result = this.year + "-" + pad2(this.month) + "-" + pad2(this.day);
      if (!this.isDate) {
        result += "T" + pad2(this.hour) + ":" + pad2(this.minute) + ":" + pad2(this.second);
        if (this.zone === Timezone.utcTimezone) {
          result += "Z";
        }
      }
      return result;
    }
    /**
     * Converts the current instance to a Javascript date
     * @return {Date}
     */
    toJSDate() {
      if (this.zone == Timezone.localTimezone) {
        if (this.isDate) {
          return new Date(this.year, this.month - 1, this.day);
        } else {
          return new Date(
            this.year,
            this.month - 1,
            this.day,
            this.hour,
            this.minute,
            this.second,
            0
          );
        }
      } else {
        return new Date(this.toUnixTime() * 1e3);
      }
    }
    _normalize() {
      if (this._time.isDate) {
        this._time.hour = 0;
        this._time.minute = 0;
        this._time.second = 0;
      }
      this.adjust(0, 0, 0, 0);
      return this;
    }
    /**
     * Adjust the date/time by the given offset
     *
     * @param {Number} aExtraDays       The extra amount of days
     * @param {Number} aExtraHours      The extra amount of hours
     * @param {Number} aExtraMinutes    The extra amount of minutes
     * @param {Number} aExtraSeconds    The extra amount of seconds
     * @param {Number=} aTime           The time to adjust, defaults to the
     *                                    current instance.
     */
    adjust(aExtraDays, aExtraHours, aExtraMinutes, aExtraSeconds, aTime) {
      let minutesOverflow, hoursOverflow, daysOverflow = 0, yearsOverflow = 0;
      let second, minute, hour, day;
      let daysInMonth;
      let time = aTime || this._time;
      if (!time.isDate) {
        second = time.second + aExtraSeconds;
        time.second = second % 60;
        minutesOverflow = trunc(second / 60);
        if (time.second < 0) {
          time.second += 60;
          minutesOverflow--;
        }
        minute = time.minute + aExtraMinutes + minutesOverflow;
        time.minute = minute % 60;
        hoursOverflow = trunc(minute / 60);
        if (time.minute < 0) {
          time.minute += 60;
          hoursOverflow--;
        }
        hour = time.hour + aExtraHours + hoursOverflow;
        time.hour = hour % 24;
        daysOverflow = trunc(hour / 24);
        if (time.hour < 0) {
          time.hour += 24;
          daysOverflow--;
        }
      }
      if (time.month > 12) {
        yearsOverflow = trunc((time.month - 1) / 12);
      } else if (time.month < 1) {
        yearsOverflow = trunc(time.month / 12) - 1;
      }
      time.year += yearsOverflow;
      time.month -= 12 * yearsOverflow;
      day = time.day + aExtraDays + daysOverflow;
      if (day > 0) {
        for (; ; ) {
          daysInMonth = _Time.daysInMonth(time.month, time.year);
          if (day <= daysInMonth) {
            break;
          }
          time.month++;
          if (time.month > 12) {
            time.year++;
            time.month = 1;
          }
          day -= daysInMonth;
        }
      } else {
        while (day <= 0) {
          if (time.month == 1) {
            time.year--;
            time.month = 12;
          } else {
            time.month--;
          }
          day += _Time.daysInMonth(time.month, time.year);
        }
      }
      time.day = day;
      this._cachedUnixTime = null;
      return this;
    }
    /**
     * Sets up the current instance from unix time, the number of seconds since
     * January 1st, 1970.
     *
     * @param {Number} seconds      The seconds to set up with
     */
    fromUnixTime(seconds) {
      this.zone = Timezone.utcTimezone;
      let date = new Date(seconds * 1e3);
      this.year = date.getUTCFullYear();
      this.month = date.getUTCMonth() + 1;
      this.day = date.getUTCDate();
      if (this._time.isDate) {
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
      } else {
        this.hour = date.getUTCHours();
        this.minute = date.getUTCMinutes();
        this.second = date.getUTCSeconds();
      }
      this._cachedUnixTime = null;
    }
    /**
     * Converts the current instance to seconds since January 1st 1970.
     *
     * @return {Number}         Seconds since 1970
     */
    toUnixTime() {
      if (this._cachedUnixTime !== null) {
        return this._cachedUnixTime;
      }
      let offset2 = this.utcOffset();
      let ms = Date.UTC(
        this.year,
        this.month - 1,
        this.day,
        this.hour,
        this.minute,
        this.second - offset2
      );
      this._cachedUnixTime = ms / 1e3;
      return this._cachedUnixTime;
    }
    /**
     * Converts time to into Object which can be serialized then re-created
     * using the constructor.
     *
     * @example
     * // toJSON will automatically be called
     * var json = JSON.stringify(mytime);
     *
     * var deserialized = JSON.parse(json);
     *
     * var time = new ICAL.Time(deserialized);
     *
     * @return {Object}
     */
    toJSON() {
      let copy = [
        "year",
        "month",
        "day",
        "hour",
        "minute",
        "second",
        "isDate"
      ];
      let result = /* @__PURE__ */ Object.create(null);
      let i = 0;
      let len = copy.length;
      let prop;
      for (; i < len; i++) {
        prop = copy[i];
        result[prop] = this[prop];
      }
      if (this.zone) {
        result.timezone = this.zone.tzid;
      }
      return result;
    }
  };
  var CHAR = /[^ \t]/;
  var VALUE_DELIMITER = ":";
  var PARAM_DELIMITER = ";";
  var PARAM_NAME_DELIMITER = "=";
  var DEFAULT_VALUE_TYPE$1 = "unknown";
  var DEFAULT_PARAM_TYPE = "text";
  var RFC6868_REPLACE_MAP$1 = { "^'": '"', "^n": "\n", "^^": "^" };
  function parse(input) {
    let state = {};
    let root = state.component = [];
    state.stack = [root];
    parse._eachLine(input, function(err, line) {
      parse._handleContentLine(line, state);
    });
    if (state.stack.length > 1) {
      throw new ParserError(
        "invalid ical body. component began but did not end"
      );
    }
    state = null;
    return root.length == 1 ? root[0] : root;
  }
  parse.property = function(str, designSet) {
    let state = {
      component: [[], []],
      designSet: designSet || design.defaultSet
    };
    parse._handleContentLine(str, state);
    return state.component[1][0];
  };
  parse.component = function(str) {
    return parse(str);
  };
  var ParserError = class extends Error {
    name = this.constructor.name;
  };
  parse.ParserError = ParserError;
  parse._handleContentLine = function(line, state) {
    let valuePos = line.indexOf(VALUE_DELIMITER);
    let paramPos = line.indexOf(PARAM_DELIMITER);
    let lastParamIndex;
    let lastValuePos;
    let name;
    let value;
    let params = {};
    if (paramPos !== -1 && valuePos !== -1) {
      if (paramPos > valuePos) {
        paramPos = -1;
      }
    }
    let parsedParams;
    if (paramPos !== -1) {
      name = line.slice(0, Math.max(0, paramPos)).toLowerCase();
      parsedParams = parse._parseParameters(line.slice(Math.max(0, paramPos)), 0, state.designSet);
      if (parsedParams[2] == -1) {
        throw new ParserError("Invalid parameters in '" + line + "'");
      }
      params = parsedParams[0];
      let parsedParamLength;
      if (typeof parsedParams[1] === "string") {
        parsedParamLength = parsedParams[1].length;
      } else {
        parsedParamLength = parsedParams[1].reduce((accumulator, currentValue) => {
          return accumulator + currentValue.length;
        }, 0);
      }
      lastParamIndex = parsedParamLength + parsedParams[2] + paramPos;
      if ((lastValuePos = line.slice(Math.max(0, lastParamIndex)).indexOf(VALUE_DELIMITER)) !== -1) {
        value = line.slice(Math.max(0, lastParamIndex + lastValuePos + 1));
      } else {
        throw new ParserError("Missing parameter value in '" + line + "'");
      }
    } else if (valuePos !== -1) {
      name = line.slice(0, Math.max(0, valuePos)).toLowerCase();
      value = line.slice(Math.max(0, valuePos + 1));
      if (name === "begin") {
        let newComponent = [value.toLowerCase(), [], []];
        if (state.stack.length === 1) {
          state.component.push(newComponent);
        } else {
          state.component[2].push(newComponent);
        }
        state.stack.push(state.component);
        state.component = newComponent;
        if (!state.designSet) {
          state.designSet = design.getDesignSet(state.component[0]);
        }
        return;
      } else if (name === "end") {
        state.component = state.stack.pop();
        return;
      }
    } else {
      throw new ParserError(
        'invalid line (no token ";" or ":") "' + line + '"'
      );
    }
    let valueType;
    let multiValue = false;
    let structuredValue = false;
    let propertyDetails;
    let splitName;
    let ungroupedName;
    if (state.designSet.propertyGroups && name.indexOf(".") !== -1) {
      splitName = name.split(".");
      params.group = splitName[0];
      ungroupedName = splitName[1];
    } else {
      ungroupedName = name;
    }
    if (ungroupedName in state.designSet.property) {
      propertyDetails = state.designSet.property[ungroupedName];
      if ("multiValue" in propertyDetails) {
        multiValue = propertyDetails.multiValue;
      }
      if ("structuredValue" in propertyDetails) {
        structuredValue = propertyDetails.structuredValue;
      }
      if (value && "detectType" in propertyDetails) {
        valueType = propertyDetails.detectType(value);
      }
    }
    if (!valueType) {
      if (!("value" in params)) {
        if (propertyDetails) {
          valueType = propertyDetails.defaultType;
        } else {
          valueType = DEFAULT_VALUE_TYPE$1;
        }
      } else {
        valueType = params.value.toLowerCase();
      }
    }
    delete params.value;
    let result;
    if (multiValue && structuredValue) {
      value = parse._parseMultiValue(value, structuredValue, valueType, [], multiValue, state.designSet, structuredValue);
      result = [ungroupedName, params, valueType, value];
    } else if (multiValue) {
      result = [ungroupedName, params, valueType];
      parse._parseMultiValue(value, multiValue, valueType, result, null, state.designSet, false);
    } else if (structuredValue) {
      value = parse._parseMultiValue(value, structuredValue, valueType, [], null, state.designSet, structuredValue);
      result = [ungroupedName, params, valueType, value];
    } else {
      value = parse._parseValue(value, valueType, state.designSet, false);
      result = [ungroupedName, params, valueType, value];
    }
    if (state.component[0] === "vcard" && state.component[1].length === 0 && !(name === "version" && value === "4.0")) {
      state.designSet = design.getDesignSet("vcard3");
    }
    state.component[1].push(result);
  };
  parse._parseValue = function(value, type, designSet, structuredValue) {
    if (type in designSet.value && "fromICAL" in designSet.value[type]) {
      return designSet.value[type].fromICAL(value, structuredValue);
    }
    return value;
  };
  parse._parseParameters = function(line, start2, designSet) {
    let lastParam = start2;
    let pos = 0;
    let delim = PARAM_NAME_DELIMITER;
    let result = {};
    let name, lcname;
    let value, valuePos = -1;
    let type, multiValue, mvdelim;
    while (pos !== false && (pos = line.indexOf(delim, pos + 1)) !== -1) {
      name = line.slice(lastParam + 1, pos);
      if (name.length == 0) {
        throw new ParserError("Empty parameter name in '" + line + "'");
      }
      lcname = name.toLowerCase();
      mvdelim = false;
      multiValue = false;
      if (lcname in designSet.param && designSet.param[lcname].valueType) {
        type = designSet.param[lcname].valueType;
      } else {
        type = DEFAULT_PARAM_TYPE;
      }
      if (lcname in designSet.param) {
        multiValue = designSet.param[lcname].multiValue;
        if (designSet.param[lcname].multiValueSeparateDQuote) {
          mvdelim = parse._rfc6868Escape('"' + multiValue + '"');
        }
      }
      let nextChar = line[pos + 1];
      if (nextChar === '"') {
        valuePos = pos + 2;
        pos = line.indexOf('"', valuePos);
        if (multiValue && pos != -1) {
          let extendedValue = true;
          while (extendedValue) {
            if (line[pos + 1] == multiValue && line[pos + 2] == '"') {
              pos = line.indexOf('"', pos + 3);
            } else {
              extendedValue = false;
            }
          }
        }
        if (pos === -1) {
          throw new ParserError(
            'invalid line (no matching double quote) "' + line + '"'
          );
        }
        value = line.slice(valuePos, pos);
        lastParam = line.indexOf(PARAM_DELIMITER, pos);
        let propValuePos = line.indexOf(VALUE_DELIMITER, pos);
        if (lastParam === -1 || propValuePos !== -1 && lastParam > propValuePos) {
          pos = false;
        }
      } else {
        valuePos = pos + 1;
        let nextPos = line.indexOf(PARAM_DELIMITER, valuePos);
        let propValuePos = line.indexOf(VALUE_DELIMITER, valuePos);
        if (propValuePos !== -1 && nextPos > propValuePos) {
          nextPos = propValuePos;
          pos = false;
        } else if (nextPos === -1) {
          if (propValuePos === -1) {
            nextPos = line.length;
          } else {
            nextPos = propValuePos;
          }
          pos = false;
        } else {
          lastParam = nextPos;
          pos = nextPos;
        }
        value = line.slice(valuePos, nextPos);
      }
      const length_before = value.length;
      value = parse._rfc6868Escape(value);
      valuePos += length_before - value.length;
      if (multiValue) {
        let delimiter = mvdelim || multiValue;
        value = parse._parseMultiValue(value, delimiter, type, [], null, designSet);
      } else {
        value = parse._parseValue(value, type, designSet);
      }
      if (multiValue && lcname in result) {
        if (Array.isArray(result[lcname])) {
          result[lcname].push(value);
        } else {
          result[lcname] = [
            result[lcname],
            value
          ];
        }
      } else {
        result[lcname] = value;
      }
    }
    return [result, value, valuePos];
  };
  parse._rfc6868Escape = function(val) {
    return val.replace(/\^['n^]/g, function(x) {
      return RFC6868_REPLACE_MAP$1[x];
    });
  };
  parse._parseMultiValue = function(buffer, delim, type, result, innerMulti, designSet, structuredValue) {
    let pos = 0;
    let lastPos = 0;
    let value;
    if (delim.length === 0) {
      return buffer;
    }
    while ((pos = unescapedIndexOf(buffer, delim, lastPos)) !== -1) {
      value = buffer.slice(lastPos, pos);
      if (innerMulti) {
        value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
      } else {
        value = parse._parseValue(value, type, designSet, structuredValue);
      }
      result.push(value);
      lastPos = pos + delim.length;
    }
    value = buffer.slice(lastPos);
    if (innerMulti) {
      value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
    } else {
      value = parse._parseValue(value, type, designSet, structuredValue);
    }
    result.push(value);
    return result.length == 1 ? result[0] : result;
  };
  parse._eachLine = function(buffer, callback) {
    let len = buffer.length;
    let lastPos = buffer.search(CHAR);
    let pos = lastPos;
    let line;
    let firstChar;
    let newlineOffset;
    do {
      pos = buffer.indexOf("\n", lastPos) + 1;
      if (pos > 1 && buffer[pos - 2] === "\r") {
        newlineOffset = 2;
      } else {
        newlineOffset = 1;
      }
      if (pos === 0) {
        pos = len;
        newlineOffset = 0;
      }
      firstChar = buffer[lastPos];
      if (firstChar === " " || firstChar === "	") {
        line += buffer.slice(lastPos + 1, pos - newlineOffset);
      } else {
        if (line)
          callback(null, line);
        line = buffer.slice(lastPos, pos - newlineOffset);
      }
      lastPos = pos;
    } while (pos !== len);
    line = line.trim();
    if (line.length)
      callback(null, line);
  };
  var OPTIONS = ["tzid", "location", "tznames", "latitude", "longitude"];
  var Timezone = class _Timezone {
    static _compare_change_fn(a, b) {
      if (a.year < b.year)
        return -1;
      else if (a.year > b.year)
        return 1;
      if (a.month < b.month)
        return -1;
      else if (a.month > b.month)
        return 1;
      if (a.day < b.day)
        return -1;
      else if (a.day > b.day)
        return 1;
      if (a.hour < b.hour)
        return -1;
      else if (a.hour > b.hour)
        return 1;
      if (a.minute < b.minute)
        return -1;
      else if (a.minute > b.minute)
        return 1;
      if (a.second < b.second)
        return -1;
      else if (a.second > b.second)
        return 1;
      return 0;
    }
    /**
     * Convert the date/time from one zone to the next.
     *
     * @param {Time} tt                  The time to convert
     * @param {Timezone} from_zone       The source zone to convert from
     * @param {Timezone} to_zone         The target zone to convert to
     * @return {Time}                    The converted date/time object
     */
    static convert_time(tt, from_zone, to_zone) {
      if (tt.isDate || from_zone.tzid == to_zone.tzid || from_zone == _Timezone.localTimezone || to_zone == _Timezone.localTimezone) {
        tt.zone = to_zone;
        return tt;
      }
      let utcOffset = from_zone.utcOffset(tt);
      tt.adjust(0, 0, 0, -utcOffset);
      utcOffset = to_zone.utcOffset(tt);
      tt.adjust(0, 0, 0, utcOffset);
      return null;
    }
    /**
     * Creates a new ICAL.Timezone instance from the passed data object.
     *
     * @param {Component|Object} aData options for class
     * @param {String|Component} aData.component
     *        If aData is a simple object, then this member can be set to either a
     *        string containing the component data, or an already parsed
     *        ICAL.Component
     * @param {String} aData.tzid      The timezone identifier
     * @param {String} aData.location  The timezone locationw
     * @param {String} aData.tznames   An alternative string representation of the
     *                                  timezone
     * @param {Number} aData.latitude  The latitude of the timezone
     * @param {Number} aData.longitude The longitude of the timezone
     */
    static fromData(aData) {
      let tt = new _Timezone();
      return tt.fromData(aData);
    }
    /**
     * The instance describing the UTC timezone
     * @type {Timezone}
     * @constant
     * @instance
     */
    static #utcTimezone = null;
    static get utcTimezone() {
      if (!this.#utcTimezone) {
        this.#utcTimezone = _Timezone.fromData({
          tzid: "UTC"
        });
      }
      return this.#utcTimezone;
    }
    /**
     * The instance describing the local timezone
     * @type {Timezone}
     * @constant
     * @instance
     */
    static #localTimezone = null;
    static get localTimezone() {
      if (!this.#localTimezone) {
        this.#localTimezone = _Timezone.fromData({
          tzid: "floating"
        });
      }
      return this.#localTimezone;
    }
    /**
     * Adjust a timezone change object.
     * @private
     * @param {Object} change     The timezone change object
     * @param {Number} days       The extra amount of days
     * @param {Number} hours      The extra amount of hours
     * @param {Number} minutes    The extra amount of minutes
     * @param {Number} seconds    The extra amount of seconds
     */
    static adjust_change(change, days, hours, minutes, seconds) {
      return Time.prototype.adjust.call(
        change,
        days,
        hours,
        minutes,
        seconds,
        change
      );
    }
    static _minimumExpansionYear = -1;
    static EXTRA_COVERAGE = 5;
    /**
     * Creates a new ICAL.Timezone instance, by passing in a tzid and component.
     *
     * @param {Component|Object} data options for class
     * @param {String|Component} data.component
     *        If data is a simple object, then this member can be set to either a
     *        string containing the component data, or an already parsed
     *        ICAL.Component
     * @param {String} data.tzid      The timezone identifier
     * @param {String} data.location  The timezone locationw
     * @param {String} data.tznames   An alternative string representation of the
     *                                  timezone
     * @param {Number} data.latitude  The latitude of the timezone
     * @param {Number} data.longitude The longitude of the timezone
     */
    constructor(data) {
      this.wrappedJSObject = this;
      this.fromData(data);
    }
    /**
     * Timezone identifier
     * @type {String}
     */
    tzid = "";
    /**
     * Timezone location
     * @type {String}
     */
    location = "";
    /**
     * Alternative timezone name, for the string representation
     * @type {String}
     */
    tznames = "";
    /**
     * The primary latitude for the timezone.
     * @type {Number}
     */
    latitude = 0;
    /**
     * The primary longitude for the timezone.
     * @type {Number}
     */
    longitude = 0;
    /**
     * The vtimezone component for this timezone.
     * @type {Component}
     */
    component = null;
    /**
     * The year this timezone has been expanded to. All timezone transition
     * dates until this year are known and can be used for calculation
     *
     * @private
     * @type {Number}
     */
    expandedUntilYear = 0;
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icaltimezone"
     */
    icalclass = "icaltimezone";
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param {Component|Object} aData options for class
     * @param {String|Component} aData.component
     *        If aData is a simple object, then this member can be set to either a
     *        string containing the component data, or an already parsed
     *        ICAL.Component
     * @param {String} aData.tzid      The timezone identifier
     * @param {String} aData.location  The timezone locationw
     * @param {String} aData.tznames   An alternative string representation of the
     *                                  timezone
     * @param {Number} aData.latitude  The latitude of the timezone
     * @param {Number} aData.longitude The longitude of the timezone
     */
    fromData(aData) {
      this.expandedUntilYear = 0;
      this.changes = [];
      if (aData instanceof Component) {
        this.component = aData;
      } else {
        if (aData && "component" in aData) {
          if (typeof aData.component == "string") {
            let jCal = parse(aData.component);
            this.component = new Component(jCal);
          } else if (aData.component instanceof Component) {
            this.component = aData.component;
          } else {
            this.component = null;
          }
        }
        for (let prop of OPTIONS) {
          if (aData && prop in aData) {
            this[prop] = aData[prop];
          }
        }
      }
      if (this.component instanceof Component && !this.tzid) {
        this.tzid = this.component.getFirstPropertyValue("tzid");
      }
      return this;
    }
    /**
     * Finds the utcOffset the given time would occur in this timezone.
     *
     * @param {Time} tt         The time to check for
     * @return {Number}         utc offset in seconds
     */
    utcOffset(tt) {
      if (this == _Timezone.utcTimezone || this == _Timezone.localTimezone) {
        return 0;
      }
      this._ensureCoverage(tt.year);
      if (!this.changes.length) {
        return 0;
      }
      let tt_change = {
        year: tt.year,
        month: tt.month,
        day: tt.day,
        hour: tt.hour,
        minute: tt.minute,
        second: tt.second
      };
      let change_num = this._findNearbyChange(tt_change);
      let change_num_to_use = -1;
      let step = 1;
      for (; ; ) {
        let change = clone(this.changes[change_num], true);
        if (change.utcOffset < change.prevUtcOffset) {
          _Timezone.adjust_change(change, 0, 0, 0, change.utcOffset);
        } else {
          _Timezone.adjust_change(
            change,
            0,
            0,
            0,
            change.prevUtcOffset
          );
        }
        let cmp = _Timezone._compare_change_fn(tt_change, change);
        if (cmp >= 0) {
          change_num_to_use = change_num;
        } else {
          step = -1;
        }
        if (step == -1 && change_num_to_use != -1) {
          break;
        }
        change_num += step;
        if (change_num < 0) {
          return 0;
        }
        if (change_num >= this.changes.length) {
          break;
        }
      }
      let zone_change = this.changes[change_num_to_use];
      let utcOffset_change = zone_change.utcOffset - zone_change.prevUtcOffset;
      if (utcOffset_change < 0 && change_num_to_use > 0) {
        let tmp_change = clone(zone_change, true);
        _Timezone.adjust_change(tmp_change, 0, 0, 0, tmp_change.prevUtcOffset);
        if (_Timezone._compare_change_fn(tt_change, tmp_change) < 0) {
          let prev_zone_change = this.changes[change_num_to_use - 1];
          let want_daylight = false;
          if (zone_change.is_daylight != want_daylight && prev_zone_change.is_daylight == want_daylight) {
            zone_change = prev_zone_change;
          }
        }
      }
      return zone_change.utcOffset;
    }
    _findNearbyChange(change) {
      let idx = binsearchInsert(
        this.changes,
        change,
        _Timezone._compare_change_fn
      );
      if (idx >= this.changes.length) {
        return this.changes.length - 1;
      }
      return idx;
    }
    _ensureCoverage(aYear) {
      if (_Timezone._minimumExpansionYear == -1) {
        let today = Time.now();
        _Timezone._minimumExpansionYear = today.year;
      }
      let changesEndYear = aYear;
      if (changesEndYear < _Timezone._minimumExpansionYear) {
        changesEndYear = _Timezone._minimumExpansionYear;
      }
      changesEndYear += _Timezone.EXTRA_COVERAGE;
      if (!this.changes.length || this.expandedUntilYear < aYear) {
        let subcomps = this.component.getAllSubcomponents();
        let compLen = subcomps.length;
        let compIdx = 0;
        for (; compIdx < compLen; compIdx++) {
          this._expandComponent(
            subcomps[compIdx],
            changesEndYear,
            this.changes
          );
        }
        this.changes.sort(_Timezone._compare_change_fn);
        this.expandedUntilYear = changesEndYear;
      }
    }
    _expandComponent(aComponent, aYear, changes) {
      if (!aComponent.hasProperty("dtstart") || !aComponent.hasProperty("tzoffsetto") || !aComponent.hasProperty("tzoffsetfrom")) {
        return null;
      }
      let dtstart = aComponent.getFirstProperty("dtstart").getFirstValue();
      let change;
      function convert_tzoffset(offset2) {
        return offset2.factor * (offset2.hours * 3600 + offset2.minutes * 60);
      }
      function init_changes() {
        let changebase = {};
        changebase.is_daylight = aComponent.name == "daylight";
        changebase.utcOffset = convert_tzoffset(
          aComponent.getFirstProperty("tzoffsetto").getFirstValue()
        );
        changebase.prevUtcOffset = convert_tzoffset(
          aComponent.getFirstProperty("tzoffsetfrom").getFirstValue()
        );
        return changebase;
      }
      if (!aComponent.hasProperty("rrule") && !aComponent.hasProperty("rdate")) {
        change = init_changes();
        change.year = dtstart.year;
        change.month = dtstart.month;
        change.day = dtstart.day;
        change.hour = dtstart.hour;
        change.minute = dtstart.minute;
        change.second = dtstart.second;
        _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
        changes.push(change);
      } else {
        let props = aComponent.getAllProperties("rdate");
        for (let rdate of props) {
          let time = rdate.getFirstValue();
          change = init_changes();
          change.year = time.year;
          change.month = time.month;
          change.day = time.day;
          if (time.isDate) {
            change.hour = dtstart.hour;
            change.minute = dtstart.minute;
            change.second = dtstart.second;
            if (dtstart.zone != _Timezone.utcTimezone) {
              _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
            }
          } else {
            change.hour = time.hour;
            change.minute = time.minute;
            change.second = time.second;
            if (time.zone != _Timezone.utcTimezone) {
              _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
            }
          }
          changes.push(change);
        }
        let rrule = aComponent.getFirstProperty("rrule");
        if (rrule) {
          rrule = rrule.getFirstValue();
          change = init_changes();
          if (rrule.until && rrule.until.zone == _Timezone.utcTimezone) {
            rrule.until.adjust(0, 0, 0, change.prevUtcOffset);
            rrule.until.zone = _Timezone.localTimezone;
          }
          let iterator = rrule.iterator(dtstart);
          let occ;
          while (occ = iterator.next()) {
            change = init_changes();
            if (occ.year > aYear || !occ) {
              break;
            }
            change.year = occ.year;
            change.month = occ.month;
            change.day = occ.day;
            change.hour = occ.hour;
            change.minute = occ.minute;
            change.second = occ.second;
            change.isDate = occ.isDate;
            _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
            changes.push(change);
          }
        }
      }
      return changes;
    }
    /**
     * The string representation of this timezone.
     * @return {String}
     */
    toString() {
      return this.tznames ? this.tznames : this.tzid;
    }
  };
  var zones = null;
  var TimezoneService = {
    get count() {
      if (zones === null) {
        return 0;
      }
      return Object.keys(zones).length;
    },
    reset: function() {
      zones = /* @__PURE__ */ Object.create(null);
      let utc = Timezone.utcTimezone;
      zones.Z = utc;
      zones.UTC = utc;
      zones.GMT = utc;
    },
    _hard_reset: function() {
      zones = null;
    },
    /**
     * Checks if timezone id has been registered.
     *
     * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
     * @return {Boolean}        False, when not present
     */
    has: function(tzid) {
      if (zones === null) {
        return false;
      }
      return !!zones[tzid];
    },
    /**
     * Returns a timezone by its tzid if present.
     *
     * @param {String} tzid               Timezone identifier (e.g. America/Los_Angeles)
     * @return {Timezone | undefined}     The timezone, or undefined if not found
     */
    get: function(tzid) {
      if (zones === null) {
        this.reset();
      }
      return zones[tzid];
    },
    /**
     * Registers a timezone object or component.
     *
     * @param {Component|Timezone} timezone
     *        The initialized zone or vtimezone.
     *
     * @param {String=} name
     *        The name of the timezone. Defaults to the component's TZID if not
     *        passed.
     */
    register: function(timezone, name) {
      if (zones === null) {
        this.reset();
      }
      if (typeof timezone === "string" && name instanceof Timezone) {
        [timezone, name] = [name, timezone];
      }
      if (!name) {
        if (timezone instanceof Timezone) {
          name = timezone.tzid;
        } else {
          if (timezone.name === "vtimezone") {
            timezone = new Timezone(timezone);
            name = timezone.tzid;
          }
        }
      }
      if (!name) {
        throw new TypeError("Neither a timezone nor a name was passed");
      }
      if (timezone instanceof Timezone) {
        zones[name] = timezone;
      } else {
        throw new TypeError("timezone must be ICAL.Timezone or ICAL.Component");
      }
    },
    /**
     * Removes a timezone by its tzid from the list.
     *
     * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
     * @return {?Timezone}      The removed timezone, or null if not registered
     */
    remove: function(tzid) {
      if (zones === null) {
        return null;
      }
      return delete zones[tzid];
    }
  };
  function updateTimezones(vcal) {
    let allsubs, properties, vtimezones, reqTzid, i;
    if (!vcal || vcal.name !== "vcalendar") {
      return vcal;
    }
    allsubs = vcal.getAllSubcomponents();
    properties = [];
    vtimezones = {};
    for (i = 0; i < allsubs.length; i++) {
      if (allsubs[i].name === "vtimezone") {
        let tzid = allsubs[i].getFirstProperty("tzid").getFirstValue();
        vtimezones[tzid] = allsubs[i];
      } else {
        properties = properties.concat(allsubs[i].getAllProperties());
      }
    }
    reqTzid = {};
    for (i = 0; i < properties.length; i++) {
      let tzid = properties[i].getParameter("tzid");
      if (tzid) {
        reqTzid[tzid] = true;
      }
    }
    for (let [tzid, comp] of Object.entries(vtimezones)) {
      if (!reqTzid[tzid]) {
        vcal.removeSubcomponent(comp);
      }
    }
    for (let tzid of Object.keys(reqTzid)) {
      if (!vtimezones[tzid] && TimezoneService.has(tzid)) {
        vcal.addSubcomponent(TimezoneService.get(tzid).component);
      }
    }
    return vcal;
  }
  function isStrictlyNaN(number) {
    return typeof number === "number" && isNaN(number);
  }
  function strictParseInt(string) {
    let result = parseInt(string, 10);
    if (isStrictlyNaN(result)) {
      throw new Error(
        'Could not extract integer from "' + string + '"'
      );
    }
    return result;
  }
  function formatClassType(data, type) {
    if (typeof data === "undefined") {
      return void 0;
    }
    if (data instanceof type) {
      return data;
    }
    return new type(data);
  }
  function unescapedIndexOf(buffer, search, pos) {
    while ((pos = buffer.indexOf(search, pos)) !== -1) {
      if (pos > 0 && buffer[pos - 1] === "\\") {
        pos += 1;
      } else {
        return pos;
      }
    }
    return -1;
  }
  function binsearchInsert(list, seekVal, cmpfunc) {
    if (!list.length)
      return 0;
    let low = 0, high = list.length - 1, mid, cmpval;
    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(seekVal, list[mid]);
      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        break;
    }
    if (cmpval < 0)
      return mid;
    else if (cmpval > 0)
      return mid + 1;
    else
      return mid;
  }
  function clone(aSrc, aDeep) {
    if (!aSrc || typeof aSrc != "object") {
      return aSrc;
    } else if (aSrc instanceof Date) {
      return new Date(aSrc.getTime());
    } else if ("clone" in aSrc) {
      return aSrc.clone();
    } else if (Array.isArray(aSrc)) {
      let arr = [];
      for (let i = 0; i < aSrc.length; i++) {
        arr.push(aDeep ? clone(aSrc[i], true) : aSrc[i]);
      }
      return arr;
    } else {
      let obj = {};
      for (let [name, value] of Object.entries(aSrc)) {
        if (aDeep) {
          obj[name] = clone(value, true);
        } else {
          obj[name] = value;
        }
      }
      return obj;
    }
  }
  function foldline(aLine) {
    let result = "";
    let line = aLine || "", pos = 0, line_length = 0;
    while (line.length) {
      let cp = line.codePointAt(pos);
      if (cp < 128)
        ++line_length;
      else if (cp < 2048)
        line_length += 2;
      else if (cp < 65536)
        line_length += 3;
      else
        line_length += 4;
      if (line_length < ICALmodule.foldLength + 1)
        pos += cp > 65535 ? 2 : 1;
      else {
        result += ICALmodule.newLineChar + " " + line.slice(0, Math.max(0, pos));
        line = line.slice(Math.max(0, pos));
        pos = line_length = 0;
      }
    }
    return result.slice(ICALmodule.newLineChar.length + 1);
  }
  function pad2(data) {
    if (typeof data !== "string") {
      if (typeof data === "number") {
        data = parseInt(data);
      }
      data = String(data);
    }
    let len = data.length;
    switch (len) {
      case 0:
        return "00";
      case 1:
        return "0" + data;
      default:
        return data;
    }
  }
  function trunc(number) {
    return number < 0 ? Math.ceil(number) : Math.floor(number);
  }
  function extend(source, target) {
    for (let key in source) {
      let descr = Object.getOwnPropertyDescriptor(source, key);
      if (descr && !Object.getOwnPropertyDescriptor(target, key)) {
        Object.defineProperty(target, key, descr);
      }
    }
    return target;
  }
  var helpers = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    binsearchInsert,
    clone,
    extend,
    foldline,
    formatClassType,
    isStrictlyNaN,
    pad2,
    strictParseInt,
    trunc,
    unescapedIndexOf,
    updateTimezones
  });
  var UtcOffset = class _UtcOffset {
    /**
     * Creates a new {@link ICAL.UtcOffset} instance from the passed string.
     *
     * @param {String} aString    The string to parse
     * @return {Duration}         The created utc-offset instance
     */
    static fromString(aString) {
      let options = {};
      options.factor = aString[0] === "+" ? 1 : -1;
      options.hours = strictParseInt(aString.slice(1, 3));
      options.minutes = strictParseInt(aString.slice(4, 6));
      return new _UtcOffset(options);
    }
    /**
     * Creates a new {@link ICAL.UtcOffset} instance from the passed seconds
     * value.
     *
     * @param {Number} aSeconds       The number of seconds to convert
     */
    static fromSeconds(aSeconds) {
      let instance = new _UtcOffset();
      instance.fromSeconds(aSeconds);
      return instance;
    }
    /**
     * Creates a new ICAL.UtcOffset instance.
     *
     * @param {Object} aData          An object with members of the utc offset
     * @param {Number=} aData.hours   The hours for the utc offset
     * @param {Number=} aData.minutes The minutes in the utc offset
     * @param {Number=} aData.factor  The factor for the utc-offset, either -1 or 1
     */
    constructor(aData) {
      this.fromData(aData);
    }
    /**
     * The hours in the utc-offset
     * @type {Number}
     */
    hours = 0;
    /**
     * The minutes in the utc-offset
     * @type {Number}
     */
    minutes = 0;
    /**
     * The sign of the utc offset, 1 for positive offset, -1 for negative
     * offsets.
     * @type {Number}
     */
    factor = 1;
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "utc-offset"
     */
    icaltype = "utc-offset";
    /**
     * Returns a clone of the utc offset object.
     *
     * @return {UtcOffset}     The cloned object
     */
    clone() {
      return _UtcOffset.fromSeconds(this.toSeconds());
    }
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param {Object} aData          An object with members of the utc offset
     * @param {Number=} aData.hours   The hours for the utc offset
     * @param {Number=} aData.minutes The minutes in the utc offset
     * @param {Number=} aData.factor  The factor for the utc-offset, either -1 or 1
     */
    fromData(aData) {
      if (aData) {
        for (let [key, value] of Object.entries(aData)) {
          this[key] = value;
        }
      }
      this._normalize();
    }
    /**
     * Sets up the current instance from the given seconds value. The seconds
     * value is truncated to the minute. Offsets are wrapped when the world
     * ends, the hour after UTC+14:00 is UTC-12:00.
     *
     * @param {Number} aSeconds         The seconds to convert into an offset
     */
    fromSeconds(aSeconds) {
      let secs = Math.abs(aSeconds);
      this.factor = aSeconds < 0 ? -1 : 1;
      this.hours = trunc(secs / 3600);
      secs -= this.hours * 3600;
      this.minutes = trunc(secs / 60);
      return this;
    }
    /**
     * Convert the current offset to a value in seconds
     *
     * @return {Number}                 The offset in seconds
     */
    toSeconds() {
      return this.factor * (60 * this.minutes + 3600 * this.hours);
    }
    /**
     * Compare this utc offset with another one.
     *
     * @param {UtcOffset} other             The other offset to compare with
     * @return {Number}                     -1, 0 or 1 for less/equal/greater
     */
    compare(other) {
      let a = this.toSeconds();
      let b = other.toSeconds();
      return (a > b) - (b > a);
    }
    _normalize() {
      let secs = this.toSeconds();
      let factor = this.factor;
      while (secs < -43200) {
        secs += 97200;
      }
      while (secs > 50400) {
        secs -= 97200;
      }
      this.fromSeconds(secs);
      if (secs == 0) {
        this.factor = factor;
      }
    }
    /**
     * The iCalendar string representation of this utc-offset.
     * @return {String}
     */
    toICALString() {
      return design.icalendar.value["utc-offset"].toICAL(this.toString());
    }
    /**
     * The string representation of this utc-offset.
     * @return {String}
     */
    toString() {
      return (this.factor == 1 ? "+" : "-") + pad2(this.hours) + ":" + pad2(this.minutes);
    }
  };
  var VCardTime = class _VCardTime extends Time {
    /**
     * Returns a new ICAL.VCardTime instance from a date and/or time string.
     *
     * @param {String} aValue     The string to create from
     * @param {String} aIcalType  The type for this instance, e.g. date-and-or-time
     * @return {VCardTime}        The date/time instance
     */
    static fromDateAndOrTimeString(aValue, aIcalType) {
      function part(v, s, e) {
        return v ? strictParseInt(v.slice(s, s + e)) : null;
      }
      let parts = aValue.split("T");
      let dt = parts[0], tmz = parts[1];
      let splitzone = tmz ? design.vcard.value.time._splitZone(tmz) : [];
      let zone = splitzone[0], tm = splitzone[1];
      let dtlen = dt ? dt.length : 0;
      let tmlen = tm ? tm.length : 0;
      let hasDashDate = dt && dt[0] == "-" && dt[1] == "-";
      let hasDashTime = tm && tm[0] == "-";
      let o = {
        year: hasDashDate ? null : part(dt, 0, 4),
        month: hasDashDate && (dtlen == 4 || dtlen == 7) ? part(dt, 2, 2) : dtlen == 7 ? part(dt, 5, 2) : dtlen == 10 ? part(dt, 5, 2) : null,
        day: dtlen == 5 ? part(dt, 3, 2) : dtlen == 7 && hasDashDate ? part(dt, 5, 2) : dtlen == 10 ? part(dt, 8, 2) : null,
        hour: hasDashTime ? null : part(tm, 0, 2),
        minute: hasDashTime && tmlen == 3 ? part(tm, 1, 2) : tmlen > 4 ? hasDashTime ? part(tm, 1, 2) : part(tm, 3, 2) : null,
        second: tmlen == 4 ? part(tm, 2, 2) : tmlen == 6 ? part(tm, 4, 2) : tmlen == 8 ? part(tm, 6, 2) : null
      };
      if (zone == "Z") {
        zone = Timezone.utcTimezone;
      } else if (zone && zone[3] == ":") {
        zone = UtcOffset.fromString(zone);
      } else {
        zone = null;
      }
      return new _VCardTime(o, zone, aIcalType);
    }
    /**
     * Creates a new ICAL.VCardTime instance.
     *
     * @param {Object} data                           The data for the time instance
     * @param {Number=} data.year                     The year for this date
     * @param {Number=} data.month                    The month for this date
     * @param {Number=} data.day                      The day for this date
     * @param {Number=} data.hour                     The hour for this date
     * @param {Number=} data.minute                   The minute for this date
     * @param {Number=} data.second                   The second for this date
     * @param {Timezone|UtcOffset} zone               The timezone to use
     * @param {String} icaltype                       The type for this date/time object
     */
    constructor(data, zone, icaltype) {
      super(data, zone);
      this.icaltype = icaltype || "date-and-or-time";
    }
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "vcardtime"
     */
    icalclass = "vcardtime";
    /**
     * The type name, to be used in the jCal object.
     * @type {String}
     * @default "date-and-or-time"
     */
    icaltype = "date-and-or-time";
    /**
     * Returns a clone of the vcard date/time object.
     *
     * @return {VCardTime}     The cloned object
     */
    clone() {
      return new _VCardTime(this._time, this.zone, this.icaltype);
    }
    _normalize() {
      return this;
    }
    /**
     * @inheritdoc
     */
    utcOffset() {
      if (this.zone instanceof UtcOffset) {
        return this.zone.toSeconds();
      } else {
        return Time.prototype.utcOffset.apply(this, arguments);
      }
    }
    /**
     * Returns an RFC 6350 compliant representation of this object.
     *
     * @return {String}         vcard date/time string
     */
    toICALString() {
      return design.vcard.value[this.icaltype].toICAL(this.toString());
    }
    /**
     * The string representation of this date/time, in jCard form
     * (including : and - separators).
     * @return {String}
     */
    toString() {
      let y = this.year, m = this.month, d = this.day;
      let h = this.hour, mm = this.minute, s = this.second;
      let hasYear = y !== null, hasMonth = m !== null, hasDay = d !== null;
      let hasHour = h !== null, hasMinute = mm !== null, hasSecond = s !== null;
      let datepart = (hasYear ? pad2(y) + (hasMonth || hasDay ? "-" : "") : hasMonth || hasDay ? "--" : "") + (hasMonth ? pad2(m) : "") + (hasDay ? "-" + pad2(d) : "");
      let timepart = (hasHour ? pad2(h) : "-") + (hasHour && hasMinute ? ":" : "") + (hasMinute ? pad2(mm) : "") + (!hasHour && !hasMinute ? "-" : "") + (hasMinute && hasSecond ? ":" : "") + (hasSecond ? pad2(s) : "");
      let zone;
      if (this.zone === Timezone.utcTimezone) {
        zone = "Z";
      } else if (this.zone instanceof UtcOffset) {
        zone = this.zone.toString();
      } else if (this.zone === Timezone.localTimezone) {
        zone = "";
      } else if (this.zone instanceof Timezone) {
        let offset2 = UtcOffset.fromSeconds(this.zone.utcOffset(this));
        zone = offset2.toString();
      } else {
        zone = "";
      }
      switch (this.icaltype) {
        case "time":
          return timepart + zone;
        case "date-and-or-time":
        case "date-time":
          return datepart + (timepart == "--" ? "" : "T" + timepart + zone);
        case "date":
          return datepart;
      }
      return null;
    }
  };
  var RecurIterator = class _RecurIterator {
    static _indexMap = {
      "BYSECOND": 0,
      "BYMINUTE": 1,
      "BYHOUR": 2,
      "BYDAY": 3,
      "BYMONTHDAY": 4,
      "BYYEARDAY": 5,
      "BYWEEKNO": 6,
      "BYMONTH": 7,
      "BYSETPOS": 8
    };
    static _expandMap = {
      "SECONDLY": [1, 1, 1, 1, 1, 1, 1, 1],
      "MINUTELY": [2, 1, 1, 1, 1, 1, 1, 1],
      "HOURLY": [2, 2, 1, 1, 1, 1, 1, 1],
      "DAILY": [2, 2, 2, 1, 1, 1, 1, 1],
      "WEEKLY": [2, 2, 2, 2, 3, 3, 1, 1],
      "MONTHLY": [2, 2, 2, 2, 2, 3, 3, 1],
      "YEARLY": [2, 2, 2, 2, 2, 2, 2, 2]
    };
    static UNKNOWN = 0;
    static CONTRACT = 1;
    static EXPAND = 2;
    static ILLEGAL = 3;
    /**
     * Creates a new ICAL.RecurIterator instance. The options object may contain additional members
     * when resuming iteration from a previous run.
     *
     * @param {Object} options                The iterator options
     * @param {Recur} options.rule            The rule to iterate.
     * @param {Time} options.dtstart          The start date of the event.
     * @param {Boolean=} options.initialized  When true, assume that options are
     *        from a previously constructed iterator. Initialization will not be
     *        repeated.
     */
    constructor(options) {
      this.fromData(options);
    }
    /**
     * True when iteration is finished.
     * @type {Boolean}
     */
    completed = false;
    /**
     * The rule that is being iterated
     * @type {Recur}
     */
    rule = null;
    /**
     * The start date of the event being iterated.
     * @type {Time}
     */
    dtstart = null;
    /**
     * The last occurrence that was returned from the
     * {@link RecurIterator#next} method.
     * @type {Time}
     */
    last = null;
    /**
     * The sequence number from the occurrence
     * @type {Number}
     */
    occurrence_number = 0;
    /**
     * The indices used for the {@link ICAL.RecurIterator#by_data} object.
     * @type {Object}
     * @private
     */
    by_indices = null;
    /**
     * If true, the iterator has already been initialized
     * @type {Boolean}
     * @private
     */
    initialized = false;
    /**
     * The initializd by-data.
     * @type {Object}
     * @private
     */
    by_data = null;
    /**
     * The expanded yeardays
     * @type {Array}
     * @private
     */
    days = null;
    /**
     * The index in the {@link ICAL.RecurIterator#days} array.
     * @type {Number}
     * @private
     */
    days_index = 0;
    /**
     * Initialize the recurrence iterator from the passed data object. This
     * method is usually not called directly, you can initialize the iterator
     * through the constructor.
     *
     * @param {Object} options                The iterator options
     * @param {Recur} options.rule            The rule to iterate.
     * @param {Time} options.dtstart          The start date of the event.
     * @param {Boolean=} options.initialized  When true, assume that options are
     *        from a previously constructed iterator. Initialization will not be
     *        repeated.
     */
    fromData(options) {
      this.rule = formatClassType(options.rule, Recur);
      if (!this.rule) {
        throw new Error("iterator requires a (ICAL.Recur) rule");
      }
      this.dtstart = formatClassType(options.dtstart, Time);
      if (!this.dtstart) {
        throw new Error("iterator requires a (ICAL.Time) dtstart");
      }
      if (options.by_data) {
        this.by_data = options.by_data;
      } else {
        this.by_data = clone(this.rule.parts, true);
      }
      if (options.occurrence_number)
        this.occurrence_number = options.occurrence_number;
      this.days = options.days || [];
      if (options.last) {
        this.last = formatClassType(options.last, Time);
      }
      this.by_indices = options.by_indices;
      if (!this.by_indices) {
        this.by_indices = {
          "BYSECOND": 0,
          "BYMINUTE": 0,
          "BYHOUR": 0,
          "BYDAY": 0,
          "BYMONTH": 0,
          "BYWEEKNO": 0,
          "BYMONTHDAY": 0
        };
      }
      this.initialized = options.initialized || false;
      if (!this.initialized) {
        try {
          this.init();
        } catch (e) {
          if (e instanceof InvalidRecurrenceRuleError) {
            this.completed = true;
          } else {
            throw e;
          }
        }
      }
    }
    /**
     * Initialize the iterator
     * @private
     */
    init() {
      this.initialized = true;
      this.last = this.dtstart.clone();
      let parts = this.by_data;
      if ("BYDAY" in parts) {
        this.sort_byday_rules(parts.BYDAY);
      }
      if ("BYYEARDAY" in parts) {
        if ("BYMONTH" in parts || "BYWEEKNO" in parts || "BYMONTHDAY" in parts) {
          throw new Error("Invalid BYYEARDAY rule");
        }
      }
      if ("BYWEEKNO" in parts && "BYMONTHDAY" in parts) {
        throw new Error("BYWEEKNO does not fit to BYMONTHDAY");
      }
      if (this.rule.freq == "MONTHLY" && ("BYYEARDAY" in parts || "BYWEEKNO" in parts)) {
        throw new Error("For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear");
      }
      if (this.rule.freq == "WEEKLY" && ("BYYEARDAY" in parts || "BYMONTHDAY" in parts)) {
        throw new Error("For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear");
      }
      if (this.rule.freq != "YEARLY" && "BYYEARDAY" in parts) {
        throw new Error("BYYEARDAY may only appear in YEARLY rules");
      }
      this.last.second = this.setup_defaults("BYSECOND", "SECONDLY", this.dtstart.second);
      this.last.minute = this.setup_defaults("BYMINUTE", "MINUTELY", this.dtstart.minute);
      this.last.hour = this.setup_defaults("BYHOUR", "HOURLY", this.dtstart.hour);
      this.last.day = this.setup_defaults("BYMONTHDAY", "DAILY", this.dtstart.day);
      this.last.month = this.setup_defaults("BYMONTH", "MONTHLY", this.dtstart.month);
      if (this.rule.freq == "WEEKLY") {
        if ("BYDAY" in parts) {
          let [, dow] = this.ruleDayOfWeek(parts.BYDAY[0], this.rule.wkst);
          let wkdy = dow - this.last.dayOfWeek(this.rule.wkst);
          if (this.last.dayOfWeek(this.rule.wkst) < dow && wkdy >= 0 || wkdy < 0) {
            this.last.day += wkdy;
          }
        } else {
          let dayName = Recur.numericDayToIcalDay(this.dtstart.dayOfWeek());
          parts.BYDAY = [dayName];
        }
      }
      if (this.rule.freq == "YEARLY") {
        const untilYear = this.rule.until ? this.rule.until.year : 2e4;
        while (this.last.year <= untilYear) {
          this.expand_year_days(this.last.year);
          if (this.days.length > 0) {
            break;
          }
          this.increment_year(this.rule.interval);
        }
        if (this.days.length == 0) {
          throw new InvalidRecurrenceRuleError();
        }
        this._nextByYearDay();
      }
      if (this.rule.freq == "MONTHLY") {
        if (this.has_by_data("BYDAY")) {
          let tempLast = null;
          let initLast = this.last.clone();
          let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
          for (let bydow of this.by_data.BYDAY) {
            this.last = initLast.clone();
            let [pos, dow] = this.ruleDayOfWeek(bydow);
            let dayOfMonth = this.last.nthWeekDay(dow, pos);
            if (pos >= 6 || pos <= -6) {
              throw new Error("Malformed values in BYDAY part");
            }
            if (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
              if (tempLast && tempLast.month == initLast.month) {
                continue;
              }
              while (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
                this.increment_month();
                daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
                dayOfMonth = this.last.nthWeekDay(dow, pos);
              }
            }
            this.last.day = dayOfMonth;
            if (!tempLast || this.last.compare(tempLast) < 0) {
              tempLast = this.last.clone();
            }
          }
          this.last = tempLast.clone();
          if (this.has_by_data("BYMONTHDAY")) {
            this._byDayAndMonthDay(true);
          }
          if (this.last.day > daysInMonth || this.last.day == 0) {
            throw new Error("Malformed values in BYDAY part");
          }
        } else if (this.has_by_data("BYMONTHDAY")) {
          this.last.day = 1;
          let normalized = this.normalizeByMonthDayRules(
            this.last.year,
            this.last.month,
            this.rule.parts.BYMONTHDAY
          ).filter((d) => d >= this.last.day);
          if (normalized.length) {
            this.last.day = normalized[0];
            this.by_data.BYMONTHDAY = normalized;
          } else {
            if (!this.next_month() && !this.next_month() && !this.next_month()) {
              throw new Error("No possible occurrences");
            }
          }
        }
      }
    }
    /**
     * Retrieve the next occurrence from the iterator.
     * @return {Time}
     */
    next(again = false) {
      let before = this.last ? this.last.clone() : null;
      if (this.rule.count && this.occurrence_number >= this.rule.count || this.rule.until && this.last.compare(this.rule.until) > 0) {
        this.completed = true;
      }
      if (this.completed) {
        return null;
      }
      if (this.occurrence_number == 0 && this.last.compare(this.dtstart) >= 0) {
        this.occurrence_number++;
        return this.last;
      }
      let valid;
      do {
        valid = 1;
        switch (this.rule.freq) {
          case "SECONDLY":
            this.next_second();
            break;
          case "MINUTELY":
            this.next_minute();
            break;
          case "HOURLY":
            this.next_hour();
            break;
          case "DAILY":
            this.next_day();
            break;
          case "WEEKLY":
            this.next_week();
            break;
          case "MONTHLY":
            valid = this.next_month();
            break;
          case "YEARLY":
            this.next_year();
            break;
          default:
            return null;
        }
      } while (!this.check_contracting_rules() || this.last.compare(this.dtstart) < 0 || !valid);
      if (this.last.compare(before) == 0) {
        if (again) {
          throw new Error("Same occurrence found twice, protecting you from death by recursion");
        }
        this.next(true);
      }
      if (this.rule.until && this.last.compare(this.rule.until) > 0) {
        this.completed = true;
        return null;
      } else {
        this.occurrence_number++;
        return this.last;
      }
    }
    next_second() {
      return this.next_generic("BYSECOND", "SECONDLY", "second", "minute");
    }
    increment_second(inc) {
      return this.increment_generic(inc, "second", 60, "minute");
    }
    next_minute() {
      return this.next_generic(
        "BYMINUTE",
        "MINUTELY",
        "minute",
        "hour",
        "next_second"
      );
    }
    increment_minute(inc) {
      return this.increment_generic(inc, "minute", 60, "hour");
    }
    next_hour() {
      return this.next_generic(
        "BYHOUR",
        "HOURLY",
        "hour",
        "monthday",
        "next_minute"
      );
    }
    increment_hour(inc) {
      this.increment_generic(inc, "hour", 24, "monthday");
    }
    next_day() {
      let this_freq = this.rule.freq == "DAILY";
      if (this.next_hour() == 0) {
        return 0;
      }
      if (this_freq) {
        this.increment_monthday(this.rule.interval);
      } else {
        this.increment_monthday(1);
      }
      return 0;
    }
    next_week() {
      let end_of_data = 0;
      if (this.next_weekday_by_week() == 0) {
        return end_of_data;
      }
      if (this.has_by_data("BYWEEKNO")) {
        this.by_indices.BYWEEKNO++;
        if (this.by_indices.BYWEEKNO == this.by_data.BYWEEKNO.length) {
          this.by_indices.BYWEEKNO = 0;
          end_of_data = 1;
        }
        this.last.month = 1;
        this.last.day = 1;
        let week_no = this.by_data.BYWEEKNO[this.by_indices.BYWEEKNO];
        this.last.day += 7 * week_no;
        if (end_of_data) {
          this.increment_year(1);
        }
      } else {
        this.increment_monthday(7 * this.rule.interval);
      }
      return end_of_data;
    }
    /**
     * Normalize each by day rule for a given year/month.
     * Takes into account ordering and negative rules
     *
     * @private
     * @param {Number} year         Current year.
     * @param {Number} month        Current month.
     * @param {Array}  rules        Array of rules.
     *
     * @return {Array} sorted and normalized rules.
     *                 Negative rules will be expanded to their
     *                 correct positive values for easier processing.
     */
    normalizeByMonthDayRules(year, month, rules) {
      let daysInMonth = Time.daysInMonth(month, year);
      let newRules = [];
      let ruleIdx = 0;
      let len = rules.length;
      let rule;
      for (; ruleIdx < len; ruleIdx++) {
        rule = parseInt(rules[ruleIdx], 10);
        if (isNaN(rule)) {
          throw new Error("Invalid BYMONTHDAY value");
        }
        if (Math.abs(rule) > daysInMonth) {
          continue;
        }
        if (rule < 0) {
          rule = daysInMonth + (rule + 1);
        } else if (rule === 0) {
          continue;
        }
        if (newRules.indexOf(rule) === -1) {
          newRules.push(rule);
        }
      }
      return newRules.sort(function(a, b) {
        return a - b;
      });
    }
    /**
     * NOTES:
     * We are given a list of dates in the month (BYMONTHDAY) (23, etc..)
     * Also we are given a list of days (BYDAY) (MO, 2SU, etc..) when
     * both conditions match a given date (this.last.day) iteration stops.
     *
     * @private
     * @param {Boolean=} isInit     When given true will not increment the
     *                                current day (this.last).
     */
    _byDayAndMonthDay(isInit) {
      let byMonthDay;
      let byDay = this.by_data.BYDAY;
      let date;
      let dateIdx = 0;
      let dateLen;
      let dayLen = byDay.length;
      let dataIsValid = 0;
      let daysInMonth;
      let self = this;
      let lastDay = this.last.day;
      function initMonth() {
        daysInMonth = Time.daysInMonth(
          self.last.month,
          self.last.year
        );
        byMonthDay = self.normalizeByMonthDayRules(
          self.last.year,
          self.last.month,
          self.by_data.BYMONTHDAY
        );
        dateLen = byMonthDay.length;
        while (byMonthDay[dateIdx] <= lastDay && !(isInit && byMonthDay[dateIdx] == lastDay) && dateIdx < dateLen - 1) {
          dateIdx++;
        }
      }
      function nextMonth() {
        lastDay = 0;
        self.increment_month();
        dateIdx = 0;
        initMonth();
      }
      initMonth();
      if (isInit) {
        lastDay -= 1;
      }
      let monthsCounter = 48;
      while (!dataIsValid && monthsCounter) {
        monthsCounter--;
        date = lastDay + 1;
        if (date > daysInMonth) {
          nextMonth();
          continue;
        }
        let next = byMonthDay[dateIdx++];
        if (next >= date) {
          lastDay = next;
        } else {
          nextMonth();
          continue;
        }
        for (let dayIdx = 0; dayIdx < dayLen; dayIdx++) {
          let parts = this.ruleDayOfWeek(byDay[dayIdx]);
          let pos = parts[0];
          let dow = parts[1];
          this.last.day = lastDay;
          if (this.last.isNthWeekDay(dow, pos)) {
            dataIsValid = 1;
            break;
          }
        }
        if (!dataIsValid && dateIdx === dateLen) {
          nextMonth();
          continue;
        }
      }
      if (monthsCounter <= 0) {
        throw new Error("Malformed values in BYDAY combined with BYMONTHDAY parts");
      }
      return dataIsValid;
    }
    next_month() {
      let data_valid = 1;
      if (this.next_hour() == 0) {
        return data_valid;
      }
      if (this.has_by_data("BYDAY") && this.has_by_data("BYMONTHDAY")) {
        data_valid = this._byDayAndMonthDay();
      } else if (this.has_by_data("BYDAY")) {
        let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
        let setpos = 0;
        let setpos_total = 0;
        if (this.has_by_data("BYSETPOS")) {
          let last_day = this.last.day;
          for (let day2 = 1; day2 <= daysInMonth; day2++) {
            this.last.day = day2;
            if (this.is_day_in_byday(this.last)) {
              setpos_total++;
              if (day2 <= last_day) {
                setpos++;
              }
            }
          }
          this.last.day = last_day;
        }
        data_valid = 0;
        let day;
        for (day = this.last.day + 1; day <= daysInMonth; day++) {
          this.last.day = day;
          if (this.is_day_in_byday(this.last)) {
            if (!this.has_by_data("BYSETPOS") || this.check_set_position(++setpos) || this.check_set_position(setpos - setpos_total - 1)) {
              data_valid = 1;
              break;
            }
          }
        }
        if (day > daysInMonth) {
          this.last.day = 1;
          this.increment_month();
          if (this.is_day_in_byday(this.last)) {
            if (!this.has_by_data("BYSETPOS") || this.check_set_position(1)) {
              data_valid = 1;
            }
          } else {
            data_valid = 0;
          }
        }
      } else if (this.has_by_data("BYMONTHDAY")) {
        this.by_indices.BYMONTHDAY++;
        if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
          this.by_indices.BYMONTHDAY = 0;
          this.increment_month();
          if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
            return 0;
          }
        }
        let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
        let day = this.by_data.BYMONTHDAY[this.by_indices.BYMONTHDAY];
        if (day < 0) {
          day = daysInMonth + day + 1;
        }
        if (day > daysInMonth) {
          this.last.day = 1;
          data_valid = this.is_day_in_byday(this.last);
        } else {
          this.last.day = day;
        }
      } else {
        this.increment_month();
        let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
        if (this.by_data.BYMONTHDAY[0] > daysInMonth) {
          data_valid = 0;
        } else {
          this.last.day = this.by_data.BYMONTHDAY[0];
        }
      }
      return data_valid;
    }
    next_weekday_by_week() {
      let end_of_data = 0;
      if (this.next_hour() == 0) {
        return end_of_data;
      }
      if (!this.has_by_data("BYDAY")) {
        return 1;
      }
      for (; ; ) {
        let tt = new Time();
        this.by_indices.BYDAY++;
        if (this.by_indices.BYDAY == Object.keys(this.by_data.BYDAY).length) {
          this.by_indices.BYDAY = 0;
          end_of_data = 1;
        }
        let coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
        let parts = this.ruleDayOfWeek(coded_day);
        let dow = parts[1];
        dow -= this.rule.wkst;
        if (dow < 0) {
          dow += 7;
        }
        tt.year = this.last.year;
        tt.month = this.last.month;
        tt.day = this.last.day;
        let startOfWeek = tt.startDoyWeek(this.rule.wkst);
        if (dow + startOfWeek < 1) {
          if (!end_of_data) {
            continue;
          }
        }
        let next = Time.fromDayOfYear(startOfWeek + dow, this.last.year);
        this.last.year = next.year;
        this.last.month = next.month;
        this.last.day = next.day;
        return end_of_data;
      }
    }
    next_year() {
      if (this.next_hour() == 0) {
        return 0;
      }
      if (++this.days_index == this.days.length) {
        this.days_index = 0;
        do {
          this.increment_year(this.rule.interval);
          if (this.has_by_data("BYMONTHDAY")) {
            this.by_data.BYMONTHDAY = this.normalizeByMonthDayRules(
              this.last.year,
              this.last.month,
              this.rule.parts.BYMONTHDAY
            );
          }
          this.expand_year_days(this.last.year);
        } while (this.days.length == 0);
      }
      this._nextByYearDay();
      return 1;
    }
    _nextByYearDay() {
      let doy = this.days[this.days_index];
      let year = this.last.year;
      if (doy < 1) {
        doy += 1;
        year += 1;
      }
      let next = Time.fromDayOfYear(doy, year);
      this.last.day = next.day;
      this.last.month = next.month;
    }
    /**
     * @param dow (eg: '1TU', '-1MO')
     * @param {weekDay=} aWeekStart The week start weekday
     * @return [pos, numericDow] (eg: [1, 3]) numericDow is relative to aWeekStart
     */
    ruleDayOfWeek(dow, aWeekStart) {
      let matches = dow.match(/([+-]?[0-9])?(MO|TU|WE|TH|FR|SA|SU)/);
      if (matches) {
        let pos = parseInt(matches[1] || 0, 10);
        dow = Recur.icalDayToNumericDay(matches[2], aWeekStart);
        return [pos, dow];
      } else {
        return [0, 0];
      }
    }
    next_generic(aRuleType, aInterval, aDateAttr, aFollowingAttr, aPreviousIncr) {
      let has_by_rule = aRuleType in this.by_data;
      let this_freq = this.rule.freq == aInterval;
      let end_of_data = 0;
      if (aPreviousIncr && this[aPreviousIncr]() == 0) {
        return end_of_data;
      }
      if (has_by_rule) {
        this.by_indices[aRuleType]++;
        let dta = this.by_data[aRuleType];
        if (this.by_indices[aRuleType] == dta.length) {
          this.by_indices[aRuleType] = 0;
          end_of_data = 1;
        }
        this.last[aDateAttr] = dta[this.by_indices[aRuleType]];
      } else if (this_freq) {
        this["increment_" + aDateAttr](this.rule.interval);
      }
      if (has_by_rule && end_of_data && this_freq) {
        this["increment_" + aFollowingAttr](1);
      }
      return end_of_data;
    }
    increment_monthday(inc) {
      for (let i = 0; i < inc; i++) {
        let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
        this.last.day++;
        if (this.last.day > daysInMonth) {
          this.last.day -= daysInMonth;
          this.increment_month();
        }
      }
    }
    increment_month() {
      this.last.day = 1;
      if (this.has_by_data("BYMONTH")) {
        this.by_indices.BYMONTH++;
        if (this.by_indices.BYMONTH == this.by_data.BYMONTH.length) {
          this.by_indices.BYMONTH = 0;
          this.increment_year(1);
        }
        this.last.month = this.by_data.BYMONTH[this.by_indices.BYMONTH];
      } else {
        if (this.rule.freq == "MONTHLY") {
          this.last.month += this.rule.interval;
        } else {
          this.last.month++;
        }
        this.last.month--;
        let years = trunc(this.last.month / 12);
        this.last.month %= 12;
        this.last.month++;
        if (years != 0) {
          this.increment_year(years);
        }
      }
      if (this.has_by_data("BYMONTHDAY")) {
        this.by_data.BYMONTHDAY = this.normalizeByMonthDayRules(
          this.last.year,
          this.last.month,
          this.rule.parts.BYMONTHDAY
        );
      }
    }
    increment_year(inc) {
      this.last.day = 1;
      this.last.year += inc;
    }
    increment_generic(inc, aDateAttr, aFactor, aNextIncrement) {
      this.last[aDateAttr] += inc;
      let nextunit = trunc(this.last[aDateAttr] / aFactor);
      this.last[aDateAttr] %= aFactor;
      if (nextunit != 0) {
        this["increment_" + aNextIncrement](nextunit);
      }
    }
    has_by_data(aRuleType) {
      return aRuleType in this.rule.parts;
    }
    expand_year_days(aYear) {
      let t = new Time();
      this.days = [];
      let parts = {};
      let rules = ["BYDAY", "BYWEEKNO", "BYMONTHDAY", "BYMONTH", "BYYEARDAY"];
      for (let part of rules) {
        if (part in this.rule.parts) {
          parts[part] = this.rule.parts[part];
        }
      }
      if ("BYMONTH" in parts && "BYWEEKNO" in parts) {
        let valid = 1;
        let validWeeks = {};
        t.year = aYear;
        t.isDate = true;
        for (let monthIdx = 0; monthIdx < this.by_data.BYMONTH.length; monthIdx++) {
          let month = this.by_data.BYMONTH[monthIdx];
          t.month = month;
          t.day = 1;
          let first_week = t.weekNumber(this.rule.wkst);
          t.day = Time.daysInMonth(month, aYear);
          let last_week = t.weekNumber(this.rule.wkst);
          for (monthIdx = first_week; monthIdx < last_week; monthIdx++) {
            validWeeks[monthIdx] = 1;
          }
        }
        for (let weekIdx = 0; weekIdx < this.by_data.BYWEEKNO.length && valid; weekIdx++) {
          let weekno = this.by_data.BYWEEKNO[weekIdx];
          if (weekno < 52) {
            valid &= validWeeks[weekIdx];
          } else {
            valid = 0;
          }
        }
        if (valid) {
          delete parts.BYMONTH;
        } else {
          delete parts.BYWEEKNO;
        }
      }
      let partCount = Object.keys(parts).length;
      if (partCount == 0) {
        let t1 = this.dtstart.clone();
        t1.year = this.last.year;
        this.days.push(t1.dayOfYear());
      } else if (partCount == 1 && "BYMONTH" in parts) {
        for (let month of this.by_data.BYMONTH) {
          let t2 = this.dtstart.clone();
          t2.year = aYear;
          t2.month = month;
          t2.isDate = true;
          this.days.push(t2.dayOfYear());
        }
      } else if (partCount == 1 && "BYMONTHDAY" in parts) {
        for (let monthday of this.by_data.BYMONTHDAY) {
          let t3 = this.dtstart.clone();
          if (monthday < 0) {
            let daysInMonth = Time.daysInMonth(t3.month, aYear);
            monthday = monthday + daysInMonth + 1;
          }
          t3.day = monthday;
          t3.year = aYear;
          t3.isDate = true;
          this.days.push(t3.dayOfYear());
        }
      } else if (partCount == 2 && "BYMONTHDAY" in parts && "BYMONTH" in parts) {
        for (let month of this.by_data.BYMONTH) {
          let daysInMonth = Time.daysInMonth(month, aYear);
          for (let monthday of this.by_data.BYMONTHDAY) {
            if (monthday < 0) {
              monthday = monthday + daysInMonth + 1;
            }
            t.day = monthday;
            t.month = month;
            t.year = aYear;
            t.isDate = true;
            this.days.push(t.dayOfYear());
          }
        }
      } else if (partCount == 1 && "BYWEEKNO" in parts)
        ;
      else if (partCount == 2 && "BYWEEKNO" in parts && "BYMONTHDAY" in parts)
        ;
      else if (partCount == 1 && "BYDAY" in parts) {
        this.days = this.days.concat(this.expand_by_day(aYear));
      } else if (partCount == 2 && "BYDAY" in parts && "BYMONTH" in parts) {
        for (let month of this.by_data.BYMONTH) {
          let daysInMonth = Time.daysInMonth(month, aYear);
          t.year = aYear;
          t.month = month;
          t.day = 1;
          t.isDate = true;
          let first_dow = t.dayOfWeek();
          let doy_offset = t.dayOfYear() - 1;
          t.day = daysInMonth;
          let last_dow = t.dayOfWeek();
          if (this.has_by_data("BYSETPOS")) {
            let by_month_day = [];
            for (let day = 1; day <= daysInMonth; day++) {
              t.day = day;
              if (this.is_day_in_byday(t)) {
                by_month_day.push(day);
              }
            }
            for (let spIndex = 0; spIndex < by_month_day.length; spIndex++) {
              if (this.check_set_position(spIndex + 1) || this.check_set_position(spIndex - by_month_day.length)) {
                this.days.push(doy_offset + by_month_day[spIndex]);
              }
            }
          } else {
            for (let coded_day of this.by_data.BYDAY) {
              let bydayParts = this.ruleDayOfWeek(coded_day);
              let pos = bydayParts[0];
              let dow = bydayParts[1];
              let month_day;
              let first_matching_day = (dow + 7 - first_dow) % 7 + 1;
              let last_matching_day = daysInMonth - (last_dow + 7 - dow) % 7;
              if (pos == 0) {
                for (let day = first_matching_day; day <= daysInMonth; day += 7) {
                  this.days.push(doy_offset + day);
                }
              } else if (pos > 0) {
                month_day = first_matching_day + (pos - 1) * 7;
                if (month_day <= daysInMonth) {
                  this.days.push(doy_offset + month_day);
                }
              } else {
                month_day = last_matching_day + (pos + 1) * 7;
                if (month_day > 0) {
                  this.days.push(doy_offset + month_day);
                }
              }
            }
          }
        }
        this.days.sort(function(a, b) {
          return a - b;
        });
      } else if (partCount == 2 && "BYDAY" in parts && "BYMONTHDAY" in parts) {
        let expandedDays = this.expand_by_day(aYear);
        for (let day of expandedDays) {
          let tt = Time.fromDayOfYear(day, aYear);
          if (this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
            this.days.push(day);
          }
        }
      } else if (partCount == 3 && "BYDAY" in parts && "BYMONTHDAY" in parts && "BYMONTH" in parts) {
        let expandedDays = this.expand_by_day(aYear);
        for (let day of expandedDays) {
          let tt = Time.fromDayOfYear(day, aYear);
          if (this.by_data.BYMONTH.indexOf(tt.month) >= 0 && this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
            this.days.push(day);
          }
        }
      } else if (partCount == 2 && "BYDAY" in parts && "BYWEEKNO" in parts) {
        let expandedDays = this.expand_by_day(aYear);
        for (let day of expandedDays) {
          let tt = Time.fromDayOfYear(day, aYear);
          let weekno = tt.weekNumber(this.rule.wkst);
          if (this.by_data.BYWEEKNO.indexOf(weekno)) {
            this.days.push(day);
          }
        }
      } else if (partCount == 3 && "BYDAY" in parts && "BYWEEKNO" in parts && "BYMONTHDAY" in parts)
        ;
      else if (partCount == 1 && "BYYEARDAY" in parts) {
        this.days = this.days.concat(this.by_data.BYYEARDAY);
      } else if (partCount == 2 && "BYYEARDAY" in parts && "BYDAY" in parts) {
        let daysInYear2 = Time.isLeapYear(aYear) ? 366 : 365;
        let expandedDays = new Set(this.expand_by_day(aYear));
        for (let doy of this.by_data.BYYEARDAY) {
          if (doy < 0) {
            doy += daysInYear2 + 1;
          }
          if (expandedDays.has(doy)) {
            this.days.push(doy);
          }
        }
      } else {
        this.days = [];
      }
      let daysInYear = Time.isLeapYear(aYear) ? 366 : 365;
      this.days.sort((a, b) => {
        if (a < 0)
          a += daysInYear + 1;
        if (b < 0)
          b += daysInYear + 1;
        return a - b;
      });
      return 0;
    }
    expand_by_day(aYear) {
      let days_list = [];
      let tmp = this.last.clone();
      tmp.year = aYear;
      tmp.month = 1;
      tmp.day = 1;
      tmp.isDate = true;
      let start_dow = tmp.dayOfWeek();
      tmp.month = 12;
      tmp.day = 31;
      tmp.isDate = true;
      let end_dow = tmp.dayOfWeek();
      let end_year_day = tmp.dayOfYear();
      for (let day of this.by_data.BYDAY) {
        let parts = this.ruleDayOfWeek(day);
        let pos = parts[0];
        let dow = parts[1];
        if (pos == 0) {
          let tmp_start_doy = (dow + 7 - start_dow) % 7 + 1;
          for (let doy = tmp_start_doy; doy <= end_year_day; doy += 7) {
            days_list.push(doy);
          }
        } else if (pos > 0) {
          let first;
          if (dow >= start_dow) {
            first = dow - start_dow + 1;
          } else {
            first = dow - start_dow + 8;
          }
          days_list.push(first + (pos - 1) * 7);
        } else {
          let last;
          pos = -pos;
          if (dow <= end_dow) {
            last = end_year_day - end_dow + dow;
          } else {
            last = end_year_day - end_dow + dow - 7;
          }
          days_list.push(last - (pos - 1) * 7);
        }
      }
      return days_list;
    }
    is_day_in_byday(tt) {
      if (this.by_data.BYDAY) {
        for (let day of this.by_data.BYDAY) {
          let parts = this.ruleDayOfWeek(day);
          let pos = parts[0];
          let dow = parts[1];
          let this_dow = tt.dayOfWeek();
          if (pos == 0 && dow == this_dow || tt.nthWeekDay(dow, pos) == tt.day) {
            return 1;
          }
        }
      }
      return 0;
    }
    /**
     * Checks if given value is in BYSETPOS.
     *
     * @private
     * @param {Numeric} aPos position to check for.
     * @return {Boolean} false unless BYSETPOS rules exist
     *                   and the given value is present in rules.
     */
    check_set_position(aPos) {
      if (this.has_by_data("BYSETPOS")) {
        let idx = this.by_data.BYSETPOS.indexOf(aPos);
        return idx !== -1;
      }
      return false;
    }
    sort_byday_rules(aRules) {
      for (let i = 0; i < aRules.length; i++) {
        for (let j = 0; j < i; j++) {
          let one = this.ruleDayOfWeek(aRules[j], this.rule.wkst)[1];
          let two = this.ruleDayOfWeek(aRules[i], this.rule.wkst)[1];
          if (one > two) {
            let tmp = aRules[i];
            aRules[i] = aRules[j];
            aRules[j] = tmp;
          }
        }
      }
    }
    check_contract_restriction(aRuleType, v) {
      let indexMapValue = _RecurIterator._indexMap[aRuleType];
      let ruleMapValue = _RecurIterator._expandMap[this.rule.freq][indexMapValue];
      let pass = false;
      if (aRuleType in this.by_data && ruleMapValue == _RecurIterator.CONTRACT) {
        let ruleType = this.by_data[aRuleType];
        for (let bydata of ruleType) {
          if (bydata == v) {
            pass = true;
            break;
          }
        }
      } else {
        pass = true;
      }
      return pass;
    }
    check_contracting_rules() {
      let dow = this.last.dayOfWeek();
      let weekNo = this.last.weekNumber(this.rule.wkst);
      let doy = this.last.dayOfYear();
      return this.check_contract_restriction("BYSECOND", this.last.second) && this.check_contract_restriction("BYMINUTE", this.last.minute) && this.check_contract_restriction("BYHOUR", this.last.hour) && this.check_contract_restriction("BYDAY", Recur.numericDayToIcalDay(dow)) && this.check_contract_restriction("BYWEEKNO", weekNo) && this.check_contract_restriction("BYMONTHDAY", this.last.day) && this.check_contract_restriction("BYMONTH", this.last.month) && this.check_contract_restriction("BYYEARDAY", doy);
    }
    setup_defaults(aRuleType, req, deftime) {
      let indexMapValue = _RecurIterator._indexMap[aRuleType];
      let ruleMapValue = _RecurIterator._expandMap[this.rule.freq][indexMapValue];
      if (ruleMapValue != _RecurIterator.CONTRACT) {
        if (!(aRuleType in this.by_data)) {
          this.by_data[aRuleType] = [deftime];
        }
        if (this.rule.freq != req) {
          return this.by_data[aRuleType][0];
        }
      }
      return deftime;
    }
    /**
     * Convert iterator into a serialize-able object.  Will preserve current
     * iteration sequence to ensure the seamless continuation of the recurrence
     * rule.
     * @return {Object}
     */
    toJSON() {
      let result = /* @__PURE__ */ Object.create(null);
      result.initialized = this.initialized;
      result.rule = this.rule.toJSON();
      result.dtstart = this.dtstart.toJSON();
      result.by_data = this.by_data;
      result.days = this.days;
      result.last = this.last.toJSON();
      result.by_indices = this.by_indices;
      result.occurrence_number = this.occurrence_number;
      return result;
    }
  };
  var InvalidRecurrenceRuleError = class extends Error {
    constructor() {
      super("Recurrence rule has no valid occurrences");
    }
  };
  var VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/;
  var VALID_BYDAY_PART = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/;
  var DOW_MAP = {
    SU: Time.SUNDAY,
    MO: Time.MONDAY,
    TU: Time.TUESDAY,
    WE: Time.WEDNESDAY,
    TH: Time.THURSDAY,
    FR: Time.FRIDAY,
    SA: Time.SATURDAY
  };
  var REVERSE_DOW_MAP = Object.fromEntries(Object.entries(DOW_MAP).map((entry) => entry.reverse()));
  var ALLOWED_FREQ = [
    "SECONDLY",
    "MINUTELY",
    "HOURLY",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "YEARLY"
  ];
  var Recur = class _Recur {
    /**
     * Creates a new {@link ICAL.Recur} instance from the passed string.
     *
     * @param {String} string         The string to parse
     * @return {Recur}                The created recurrence instance
     */
    static fromString(string) {
      let data = this._stringToData(string, false);
      return new _Recur(data);
    }
    /**
     * Creates a new {@link ICAL.Recur} instance using members from the passed
     * data object.
     *
     * @param {Object} aData                              An object with members of the recurrence
     * @param {frequencyValues=} aData.freq               The frequency value
     * @param {Number=} aData.interval                    The INTERVAL value
     * @param {weekDay=} aData.wkst                       The week start value
     * @param {Time=} aData.until                         The end of the recurrence set
     * @param {Number=} aData.count                       The number of occurrences
     * @param {Array.<Number>=} aData.bysecond            The seconds for the BYSECOND part
     * @param {Array.<Number>=} aData.byminute            The minutes for the BYMINUTE part
     * @param {Array.<Number>=} aData.byhour              The hours for the BYHOUR part
     * @param {Array.<String>=} aData.byday               The BYDAY values
     * @param {Array.<Number>=} aData.bymonthday          The days for the BYMONTHDAY part
     * @param {Array.<Number>=} aData.byyearday           The days for the BYYEARDAY part
     * @param {Array.<Number>=} aData.byweekno            The weeks for the BYWEEKNO part
     * @param {Array.<Number>=} aData.bymonth             The month for the BYMONTH part
     * @param {Array.<Number>=} aData.bysetpos            The positionals for the BYSETPOS part
     */
    static fromData(aData) {
      return new _Recur(aData);
    }
    /**
     * Converts a recurrence string to a data object, suitable for the fromData
     * method.
     *
     * @private
     * @param {String} string     The string to parse
     * @param {Boolean} fmtIcal   If true, the string is considered to be an
     *                              iCalendar string
     * @return {Recur}            The recurrence instance
     */
    static _stringToData(string, fmtIcal) {
      let dict = /* @__PURE__ */ Object.create(null);
      let values = string.split(";");
      let len = values.length;
      for (let i = 0; i < len; i++) {
        let parts = values[i].split("=");
        let ucname = parts[0].toUpperCase();
        let lcname = parts[0].toLowerCase();
        let name = fmtIcal ? lcname : ucname;
        let value = parts[1];
        if (ucname in partDesign) {
          let partArr = value.split(",");
          let partSet = /* @__PURE__ */ new Set();
          for (let part of partArr) {
            partSet.add(partDesign[ucname](part));
          }
          partArr = [...partSet];
          dict[name] = partArr.length == 1 ? partArr[0] : partArr;
        } else if (ucname in optionDesign) {
          optionDesign[ucname](value, dict, fmtIcal);
        } else {
          dict[lcname] = value;
        }
      }
      return dict;
    }
    /**
     * Convert an ical representation of a day (SU, MO, etc..)
     * into a numeric value of that day.
     *
     * @param {String} string     The iCalendar day name
     * @param {weekDay=} aWeekStart
     *        The week start weekday, defaults to SUNDAY
     * @return {Number}           Numeric value of given day
     */
    static icalDayToNumericDay(string, aWeekStart) {
      let firstDow = aWeekStart || Time.SUNDAY;
      return (DOW_MAP[string] - firstDow + 7) % 7 + 1;
    }
    /**
     * Convert a numeric day value into its ical representation (SU, MO, etc..)
     *
     * @param {Number} num        Numeric value of given day
     * @param {weekDay=} aWeekStart
     *        The week start weekday, defaults to SUNDAY
     * @return {String}           The ICAL day value, e.g SU,MO,...
     */
    static numericDayToIcalDay(num, aWeekStart) {
      let firstDow = aWeekStart || Time.SUNDAY;
      let dow = num + firstDow - Time.SUNDAY;
      if (dow > 7) {
        dow -= 7;
      }
      return REVERSE_DOW_MAP[dow];
    }
    /**
     * Create a new instance of the Recur class.
     *
     * @param {Object} data                               An object with members of the recurrence
     * @param {frequencyValues=} data.freq                The frequency value
     * @param {Number=} data.interval                     The INTERVAL value
     * @param {weekDay=} data.wkst                        The week start value
     * @param {Time=} data.until                          The end of the recurrence set
     * @param {Number=} data.count                        The number of occurrences
     * @param {Array.<Number>=} data.bysecond             The seconds for the BYSECOND part
     * @param {Array.<Number>=} data.byminute             The minutes for the BYMINUTE part
     * @param {Array.<Number>=} data.byhour               The hours for the BYHOUR part
     * @param {Array.<String>=} data.byday                The BYDAY values
     * @param {Array.<Number>=} data.bymonthday           The days for the BYMONTHDAY part
     * @param {Array.<Number>=} data.byyearday            The days for the BYYEARDAY part
     * @param {Array.<Number>=} data.byweekno             The weeks for the BYWEEKNO part
     * @param {Array.<Number>=} data.bymonth              The month for the BYMONTH part
     * @param {Array.<Number>=} data.bysetpos             The positionals for the BYSETPOS part
     */
    constructor(data) {
      this.wrappedJSObject = this;
      this.parts = {};
      if (data && typeof data === "object") {
        this.fromData(data);
      }
    }
    /**
     * An object holding the BY-parts of the recurrence rule
     * @memberof ICAL.Recur
     * @typedef {Object} byParts
     * @property {Array.<Number>=} BYSECOND            The seconds for the BYSECOND part
     * @property {Array.<Number>=} BYMINUTE            The minutes for the BYMINUTE part
     * @property {Array.<Number>=} BYHOUR              The hours for the BYHOUR part
     * @property {Array.<String>=} BYDAY               The BYDAY values
     * @property {Array.<Number>=} BYMONTHDAY          The days for the BYMONTHDAY part
     * @property {Array.<Number>=} BYYEARDAY           The days for the BYYEARDAY part
     * @property {Array.<Number>=} BYWEEKNO            The weeks for the BYWEEKNO part
     * @property {Array.<Number>=} BYMONTH             The month for the BYMONTH part
     * @property {Array.<Number>=} BYSETPOS            The positionals for the BYSETPOS part
     */
    /**
     * An object holding the BY-parts of the recurrence rule
     * @type {byParts}
     */
    parts = null;
    /**
     * The interval value for the recurrence rule.
     * @type {Number}
     */
    interval = 1;
    /**
     * The week start day
     *
     * @type {weekDay}
     * @default ICAL.Time.MONDAY
     */
    wkst = Time.MONDAY;
    /**
     * The end of the recurrence
     * @type {?Time}
     */
    until = null;
    /**
     * The maximum number of occurrences
     * @type {?Number}
     */
    count = null;
    /**
     * The frequency value.
     * @type {frequencyValues}
     */
    freq = null;
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icalrecur"
     */
    icalclass = "icalrecur";
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "recur"
     */
    icaltype = "recur";
    /**
     * Create a new iterator for this recurrence rule. The passed start date
     * must be the start date of the event, not the start of the range to
     * search in.
     *
     * @example
     * let recur = comp.getFirstPropertyValue('rrule');
     * let dtstart = comp.getFirstPropertyValue('dtstart');
     * let iter = recur.iterator(dtstart);
     * for (let next = iter.next(); next; next = iter.next()) {
     *   if (next.compare(rangeStart) < 0) {
     *     continue;
     *   }
     *   console.log(next.toString());
     * }
     *
     * @param {Time} aStart        The item's start date
     * @return {RecurIterator}     The recurrence iterator
     */
    iterator(aStart) {
      return new RecurIterator({
        rule: this,
        dtstart: aStart
      });
    }
    /**
     * Returns a clone of the recurrence object.
     *
     * @return {Recur}      The cloned object
     */
    clone() {
      return new _Recur(this.toJSON());
    }
    /**
     * Checks if the current rule is finite, i.e. has a count or until part.
     *
     * @return {Boolean}        True, if the rule is finite
     */
    isFinite() {
      return !!(this.count || this.until);
    }
    /**
     * Checks if the current rule has a count part, and not limited by an until
     * part.
     *
     * @return {Boolean}        True, if the rule is by count
     */
    isByCount() {
      return !!(this.count && !this.until);
    }
    /**
     * Adds a component (part) to the recurrence rule. This is not a component
     * in the sense of {@link ICAL.Component}, but a part of the recurrence
     * rule, i.e. BYMONTH.
     *
     * @param {String} aType            The name of the component part
     * @param {Array|String} aValue     The component value
     */
    addComponent(aType, aValue) {
      let ucname = aType.toUpperCase();
      if (ucname in this.parts) {
        this.parts[ucname].push(aValue);
      } else {
        this.parts[ucname] = [aValue];
      }
    }
    /**
     * Sets the component value for the given by-part.
     *
     * @param {String} aType        The component part name
     * @param {Array} aValues       The component values
     */
    setComponent(aType, aValues) {
      this.parts[aType.toUpperCase()] = aValues.slice();
    }
    /**
     * Gets (a copy) of the requested component value.
     *
     * @param {String} aType        The component part name
     * @return {Array}              The component part value
     */
    getComponent(aType) {
      let ucname = aType.toUpperCase();
      return ucname in this.parts ? this.parts[ucname].slice() : [];
    }
    /**
     * Retrieves the next occurrence after the given recurrence id. See the
     * guide on {@tutorial terminology} for more details.
     *
     * NOTE: Currently, this method iterates all occurrences from the start
     * date. It should not be called in a loop for performance reasons. If you
     * would like to get more than one occurrence, you can iterate the
     * occurrences manually, see the example on the
     * {@link ICAL.Recur#iterator iterator} method.
     *
     * @param {Time} aStartTime        The start of the event series
     * @param {Time} aRecurrenceId     The date of the last occurrence
     * @return {Time}                  The next occurrence after
     */
    getNextOccurrence(aStartTime, aRecurrenceId) {
      let iter = this.iterator(aStartTime);
      let next;
      do {
        next = iter.next();
      } while (next && next.compare(aRecurrenceId) <= 0);
      if (next && aRecurrenceId.zone) {
        next.zone = aRecurrenceId.zone;
      }
      return next;
    }
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param {Object} data                               An object with members of the recurrence
     * @param {frequencyValues=} data.freq                The frequency value
     * @param {Number=} data.interval                     The INTERVAL value
     * @param {weekDay=} data.wkst                        The week start value
     * @param {Time=} data.until                          The end of the recurrence set
     * @param {Number=} data.count                        The number of occurrences
     * @param {Array.<Number>=} data.bysecond             The seconds for the BYSECOND part
     * @param {Array.<Number>=} data.byminute             The minutes for the BYMINUTE part
     * @param {Array.<Number>=} data.byhour               The hours for the BYHOUR part
     * @param {Array.<String>=} data.byday                The BYDAY values
     * @param {Array.<Number>=} data.bymonthday           The days for the BYMONTHDAY part
     * @param {Array.<Number>=} data.byyearday            The days for the BYYEARDAY part
     * @param {Array.<Number>=} data.byweekno             The weeks for the BYWEEKNO part
     * @param {Array.<Number>=} data.bymonth              The month for the BYMONTH part
     * @param {Array.<Number>=} data.bysetpos             The positionals for the BYSETPOS part
     */
    fromData(data) {
      for (let key in data) {
        let uckey = key.toUpperCase();
        if (uckey in partDesign) {
          if (Array.isArray(data[key])) {
            this.parts[uckey] = data[key];
          } else {
            this.parts[uckey] = [data[key]];
          }
        } else {
          this[key] = data[key];
        }
      }
      if (this.interval && typeof this.interval != "number") {
        optionDesign.INTERVAL(this.interval, this);
      }
      if (this.wkst && typeof this.wkst != "number") {
        this.wkst = _Recur.icalDayToNumericDay(this.wkst);
      }
      if (this.until && !(this.until instanceof Time)) {
        this.until = Time.fromString(this.until);
      }
    }
    /**
     * The jCal representation of this recurrence type.
     * @return {Object}
     */
    toJSON() {
      let res = /* @__PURE__ */ Object.create(null);
      res.freq = this.freq;
      if (this.count) {
        res.count = this.count;
      }
      if (this.interval > 1) {
        res.interval = this.interval;
      }
      for (let [k, kparts] of Object.entries(this.parts)) {
        if (Array.isArray(kparts) && kparts.length == 1) {
          res[k.toLowerCase()] = kparts[0];
        } else {
          res[k.toLowerCase()] = clone(kparts);
        }
      }
      if (this.until) {
        res.until = this.until.toString();
      }
      if ("wkst" in this && this.wkst !== Time.DEFAULT_WEEK_START) {
        res.wkst = _Recur.numericDayToIcalDay(this.wkst);
      }
      return res;
    }
    /**
     * The string representation of this recurrence rule.
     * @return {String}
     */
    toString() {
      let str = "FREQ=" + this.freq;
      if (this.count) {
        str += ";COUNT=" + this.count;
      }
      if (this.interval > 1) {
        str += ";INTERVAL=" + this.interval;
      }
      for (let [k, v] of Object.entries(this.parts)) {
        str += ";" + k + "=" + v;
      }
      if (this.until) {
        str += ";UNTIL=" + this.until.toICALString();
      }
      if ("wkst" in this && this.wkst !== Time.DEFAULT_WEEK_START) {
        str += ";WKST=" + _Recur.numericDayToIcalDay(this.wkst);
      }
      return str;
    }
  };
  function parseNumericValue(type, min2, max2, value) {
    let result = value;
    if (value[0] === "+") {
      result = value.slice(1);
    }
    result = strictParseInt(result);
    if (min2 !== void 0 && value < min2) {
      throw new Error(
        type + ': invalid value "' + value + '" must be > ' + min2
      );
    }
    if (max2 !== void 0 && value > max2) {
      throw new Error(
        type + ': invalid value "' + value + '" must be < ' + min2
      );
    }
    return result;
  }
  var optionDesign = {
    FREQ: function(value, dict, fmtIcal) {
      if (ALLOWED_FREQ.indexOf(value) !== -1) {
        dict.freq = value;
      } else {
        throw new Error(
          'invalid frequency "' + value + '" expected: "' + ALLOWED_FREQ.join(", ") + '"'
        );
      }
    },
    COUNT: function(value, dict, fmtIcal) {
      dict.count = strictParseInt(value);
    },
    INTERVAL: function(value, dict, fmtIcal) {
      dict.interval = strictParseInt(value);
      if (dict.interval < 1) {
        dict.interval = 1;
      }
    },
    UNTIL: function(value, dict, fmtIcal) {
      if (value.length > 10) {
        dict.until = design.icalendar.value["date-time"].fromICAL(value);
      } else {
        dict.until = design.icalendar.value.date.fromICAL(value);
      }
      if (!fmtIcal) {
        dict.until = Time.fromString(dict.until);
      }
    },
    WKST: function(value, dict, fmtIcal) {
      if (VALID_DAY_NAMES.test(value)) {
        dict.wkst = Recur.icalDayToNumericDay(value);
      } else {
        throw new Error('invalid WKST value "' + value + '"');
      }
    }
  };
  var partDesign = {
    BYSECOND: parseNumericValue.bind(void 0, "BYSECOND", 0, 60),
    BYMINUTE: parseNumericValue.bind(void 0, "BYMINUTE", 0, 59),
    BYHOUR: parseNumericValue.bind(void 0, "BYHOUR", 0, 23),
    BYDAY: function(value) {
      if (VALID_BYDAY_PART.test(value)) {
        return value;
      } else {
        throw new Error('invalid BYDAY value "' + value + '"');
      }
    },
    BYMONTHDAY: parseNumericValue.bind(void 0, "BYMONTHDAY", -31, 31),
    BYYEARDAY: parseNumericValue.bind(void 0, "BYYEARDAY", -366, 366),
    BYWEEKNO: parseNumericValue.bind(void 0, "BYWEEKNO", -53, 53),
    BYMONTH: parseNumericValue.bind(void 0, "BYMONTH", 1, 12),
    BYSETPOS: parseNumericValue.bind(void 0, "BYSETPOS", -366, 366)
  };
  var FROM_ICAL_NEWLINE = /\\\\|\\;|\\,|\\[Nn]/g;
  var TO_ICAL_NEWLINE = /\\|;|,|\n/g;
  var FROM_VCARD_NEWLINE = /\\\\|\\,|\\[Nn]/g;
  var TO_VCARD_NEWLINE = /\\|,|\n/g;
  function createTextType(fromNewline, toNewline) {
    let result = {
      matches: /.*/,
      fromICAL: function(aValue, structuredEscape) {
        return replaceNewline(aValue, fromNewline, structuredEscape);
      },
      toICAL: function(aValue, structuredEscape) {
        let regEx = toNewline;
        if (structuredEscape)
          regEx = new RegExp(regEx.source + "|" + structuredEscape, regEx.flags);
        return aValue.replace(regEx, function(str) {
          switch (str) {
            case "\\":
              return "\\\\";
            case ";":
              return "\\;";
            case ",":
              return "\\,";
            case "\n":
              return "\\n";
            default:
              return str;
          }
        });
      }
    };
    return result;
  }
  var DEFAULT_TYPE_TEXT = { defaultType: "text" };
  var DEFAULT_TYPE_TEXT_MULTI = { defaultType: "text", multiValue: "," };
  var DEFAULT_TYPE_TEXT_STRUCTURED = { defaultType: "text", structuredValue: ";" };
  var DEFAULT_TYPE_INTEGER = { defaultType: "integer" };
  var DEFAULT_TYPE_DATETIME_DATE = { defaultType: "date-time", allowedTypes: ["date-time", "date"] };
  var DEFAULT_TYPE_DATETIME = { defaultType: "date-time" };
  var DEFAULT_TYPE_URI = { defaultType: "uri" };
  var DEFAULT_TYPE_UTCOFFSET = { defaultType: "utc-offset" };
  var DEFAULT_TYPE_RECUR = { defaultType: "recur" };
  var DEFAULT_TYPE_DATE_ANDOR_TIME = { defaultType: "date-and-or-time", allowedTypes: ["date-time", "date", "text"] };
  function replaceNewlineReplace(string) {
    switch (string) {
      case "\\\\":
        return "\\";
      case "\\;":
        return ";";
      case "\\,":
        return ",";
      case "\\n":
      case "\\N":
        return "\n";
      default:
        return string;
    }
  }
  function replaceNewline(value, newline, structuredEscape) {
    if (value.indexOf("\\") === -1) {
      return value;
    }
    if (structuredEscape)
      newline = new RegExp(newline.source + "|\\\\" + structuredEscape, newline.flags);
    return value.replace(newline, replaceNewlineReplace);
  }
  var commonProperties = {
    "categories": DEFAULT_TYPE_TEXT_MULTI,
    "url": DEFAULT_TYPE_URI,
    "version": DEFAULT_TYPE_TEXT,
    "uid": DEFAULT_TYPE_TEXT
  };
  var commonValues = {
    "boolean": {
      values: ["TRUE", "FALSE"],
      fromICAL: function(aValue) {
        switch (aValue) {
          case "TRUE":
            return true;
          case "FALSE":
            return false;
          default:
            return false;
        }
      },
      toICAL: function(aValue) {
        if (aValue) {
          return "TRUE";
        }
        return "FALSE";
      }
    },
    float: {
      matches: /^[+-]?\d+\.\d+$/,
      fromICAL: function(aValue) {
        let parsed = parseFloat(aValue);
        if (isStrictlyNaN(parsed)) {
          return 0;
        }
        return parsed;
      },
      toICAL: function(aValue) {
        return String(aValue);
      }
    },
    integer: {
      fromICAL: function(aValue) {
        let parsed = parseInt(aValue);
        if (isStrictlyNaN(parsed)) {
          return 0;
        }
        return parsed;
      },
      toICAL: function(aValue) {
        return String(aValue);
      }
    },
    "utc-offset": {
      toICAL: function(aValue) {
        if (aValue.length < 7) {
          return aValue.slice(0, 3) + aValue.slice(4, 6);
        } else {
          return aValue.slice(0, 3) + aValue.slice(4, 6) + aValue.slice(7, 9);
        }
      },
      fromICAL: function(aValue) {
        if (aValue.length < 6) {
          return aValue.slice(0, 3) + ":" + aValue.slice(3, 5);
        } else {
          return aValue.slice(0, 3) + ":" + aValue.slice(3, 5) + ":" + aValue.slice(5, 7);
        }
      },
      decorate: function(aValue) {
        return UtcOffset.fromString(aValue);
      },
      undecorate: function(aValue) {
        return aValue.toString();
      }
    }
  };
  var icalParams = {
    // Although the syntax is DQUOTE uri DQUOTE, I don't think we should
    // enforce anything aside from it being a valid content line.
    //
    // At least some params require - if multi values are used - DQUOTEs
    // for each of its values - e.g. delegated-from="uri1","uri2"
    // To indicate this, I introduced the new k/v pair
    // multiValueSeparateDQuote: true
    //
    // "ALTREP": { ... },
    // CN just wants a param-value
    // "CN": { ... }
    "cutype": {
      values: ["INDIVIDUAL", "GROUP", "RESOURCE", "ROOM", "UNKNOWN"],
      allowXName: true,
      allowIanaToken: true
    },
    "delegated-from": {
      valueType: "cal-address",
      multiValue: ",",
      multiValueSeparateDQuote: true
    },
    "delegated-to": {
      valueType: "cal-address",
      multiValue: ",",
      multiValueSeparateDQuote: true
    },
    // "DIR": { ... }, // See ALTREP
    "encoding": {
      values: ["8BIT", "BASE64"]
    },
    // "FMTTYPE": { ... }, // See ALTREP
    "fbtype": {
      values: ["FREE", "BUSY", "BUSY-UNAVAILABLE", "BUSY-TENTATIVE"],
      allowXName: true,
      allowIanaToken: true
    },
    // "LANGUAGE": { ... }, // See ALTREP
    "member": {
      valueType: "cal-address",
      multiValue: ",",
      multiValueSeparateDQuote: true
    },
    "partstat": {
      // TODO These values are actually different per-component
      values: [
        "NEEDS-ACTION",
        "ACCEPTED",
        "DECLINED",
        "TENTATIVE",
        "DELEGATED",
        "COMPLETED",
        "IN-PROCESS"
      ],
      allowXName: true,
      allowIanaToken: true
    },
    "range": {
      values: ["THISANDFUTURE"]
    },
    "related": {
      values: ["START", "END"]
    },
    "reltype": {
      values: ["PARENT", "CHILD", "SIBLING"],
      allowXName: true,
      allowIanaToken: true
    },
    "role": {
      values: [
        "REQ-PARTICIPANT",
        "CHAIR",
        "OPT-PARTICIPANT",
        "NON-PARTICIPANT"
      ],
      allowXName: true,
      allowIanaToken: true
    },
    "rsvp": {
      values: ["TRUE", "FALSE"]
    },
    "sent-by": {
      valueType: "cal-address"
    },
    "tzid": {
      matches: /^\//
    },
    "value": {
      // since the value here is a 'type' lowercase is used.
      values: [
        "binary",
        "boolean",
        "cal-address",
        "date",
        "date-time",
        "duration",
        "float",
        "integer",
        "period",
        "recur",
        "text",
        "time",
        "uri",
        "utc-offset"
      ],
      allowXName: true,
      allowIanaToken: true
    }
  };
  var icalValues = extend(commonValues, {
    text: createTextType(FROM_ICAL_NEWLINE, TO_ICAL_NEWLINE),
    uri: {
      // TODO
      /* ... */
    },
    "binary": {
      decorate: function(aString) {
        return Binary.fromString(aString);
      },
      undecorate: function(aBinary) {
        return aBinary.toString();
      }
    },
    "cal-address": {
      // needs to be an uri
    },
    "date": {
      decorate: function(aValue, aProp) {
        if (design.strict) {
          return Time.fromDateString(aValue, aProp);
        } else {
          return Time.fromString(aValue, aProp);
        }
      },
      /**
       * undecorates a time object.
       */
      undecorate: function(aValue) {
        return aValue.toString();
      },
      fromICAL: function(aValue) {
        if (!design.strict && aValue.length >= 15) {
          return icalValues["date-time"].fromICAL(aValue);
        } else {
          return aValue.slice(0, 4) + "-" + aValue.slice(4, 6) + "-" + aValue.slice(6, 8);
        }
      },
      toICAL: function(aValue) {
        let len = aValue.length;
        if (len == 10) {
          return aValue.slice(0, 4) + aValue.slice(5, 7) + aValue.slice(8, 10);
        } else if (len >= 19) {
          return icalValues["date-time"].toICAL(aValue);
        } else {
          return aValue;
        }
      }
    },
    "date-time": {
      fromICAL: function(aValue) {
        if (!design.strict && aValue.length == 8) {
          return icalValues.date.fromICAL(aValue);
        } else {
          let result = aValue.slice(0, 4) + "-" + aValue.slice(4, 6) + "-" + aValue.slice(6, 8) + "T" + aValue.slice(9, 11) + ":" + aValue.slice(11, 13) + ":" + aValue.slice(13, 15);
          if (aValue[15] && aValue[15] === "Z") {
            result += "Z";
          }
          return result;
        }
      },
      toICAL: function(aValue) {
        let len = aValue.length;
        if (len == 10 && !design.strict) {
          return icalValues.date.toICAL(aValue);
        } else if (len >= 19) {
          let result = aValue.slice(0, 4) + aValue.slice(5, 7) + // grab the (DDTHH) segment
          aValue.slice(8, 13) + // MM
          aValue.slice(14, 16) + // SS
          aValue.slice(17, 19);
          if (aValue[19] && aValue[19] === "Z") {
            result += "Z";
          }
          return result;
        } else {
          return aValue;
        }
      },
      decorate: function(aValue, aProp) {
        if (design.strict) {
          return Time.fromDateTimeString(aValue, aProp);
        } else {
          return Time.fromString(aValue, aProp);
        }
      },
      undecorate: function(aValue) {
        return aValue.toString();
      }
    },
    duration: {
      decorate: function(aValue) {
        return Duration.fromString(aValue);
      },
      undecorate: function(aValue) {
        return aValue.toString();
      }
    },
    period: {
      fromICAL: function(string) {
        let parts = string.split("/");
        parts[0] = icalValues["date-time"].fromICAL(parts[0]);
        if (!Duration.isValueString(parts[1])) {
          parts[1] = icalValues["date-time"].fromICAL(parts[1]);
        }
        return parts;
      },
      toICAL: function(parts) {
        parts = parts.slice();
        if (!design.strict && parts[0].length == 10) {
          parts[0] = icalValues.date.toICAL(parts[0]);
        } else {
          parts[0] = icalValues["date-time"].toICAL(parts[0]);
        }
        if (!Duration.isValueString(parts[1])) {
          if (!design.strict && parts[1].length == 10) {
            parts[1] = icalValues.date.toICAL(parts[1]);
          } else {
            parts[1] = icalValues["date-time"].toICAL(parts[1]);
          }
        }
        return parts.join("/");
      },
      decorate: function(aValue, aProp) {
        return Period.fromJSON(aValue, aProp, !design.strict);
      },
      undecorate: function(aValue) {
        return aValue.toJSON();
      }
    },
    recur: {
      fromICAL: function(string) {
        return Recur._stringToData(string, true);
      },
      toICAL: function(data) {
        let str = "";
        for (let [k, val] of Object.entries(data)) {
          if (k == "until") {
            if (val.length > 10) {
              val = icalValues["date-time"].toICAL(val);
            } else {
              val = icalValues.date.toICAL(val);
            }
          } else if (k == "wkst") {
            if (typeof val === "number") {
              val = Recur.numericDayToIcalDay(val);
            }
          } else if (Array.isArray(val)) {
            val = val.join(",");
          }
          str += k.toUpperCase() + "=" + val + ";";
        }
        return str.slice(0, Math.max(0, str.length - 1));
      },
      decorate: function decorate(aValue) {
        return Recur.fromData(aValue);
      },
      undecorate: function(aRecur) {
        return aRecur.toJSON();
      }
    },
    time: {
      fromICAL: function(aValue) {
        if (aValue.length < 6) {
          return aValue;
        }
        let result = aValue.slice(0, 2) + ":" + aValue.slice(2, 4) + ":" + aValue.slice(4, 6);
        if (aValue[6] === "Z") {
          result += "Z";
        }
        return result;
      },
      toICAL: function(aValue) {
        if (aValue.length < 8) {
          return aValue;
        }
        let result = aValue.slice(0, 2) + aValue.slice(3, 5) + aValue.slice(6, 8);
        if (aValue[8] === "Z") {
          result += "Z";
        }
        return result;
      }
    }
  });
  var icalProperties = extend(commonProperties, {
    "action": DEFAULT_TYPE_TEXT,
    "attach": { defaultType: "uri" },
    "attendee": { defaultType: "cal-address" },
    "calscale": DEFAULT_TYPE_TEXT,
    "class": DEFAULT_TYPE_TEXT,
    "comment": DEFAULT_TYPE_TEXT,
    "completed": DEFAULT_TYPE_DATETIME,
    "contact": DEFAULT_TYPE_TEXT,
    "created": DEFAULT_TYPE_DATETIME,
    "description": DEFAULT_TYPE_TEXT,
    "dtend": DEFAULT_TYPE_DATETIME_DATE,
    "dtstamp": DEFAULT_TYPE_DATETIME,
    "dtstart": DEFAULT_TYPE_DATETIME_DATE,
    "due": DEFAULT_TYPE_DATETIME_DATE,
    "duration": { defaultType: "duration" },
    "exdate": {
      defaultType: "date-time",
      allowedTypes: ["date-time", "date"],
      multiValue: ","
    },
    "exrule": DEFAULT_TYPE_RECUR,
    "freebusy": { defaultType: "period", multiValue: "," },
    "geo": { defaultType: "float", structuredValue: ";" },
    "last-modified": DEFAULT_TYPE_DATETIME,
    "location": DEFAULT_TYPE_TEXT,
    "method": DEFAULT_TYPE_TEXT,
    "organizer": { defaultType: "cal-address" },
    "percent-complete": DEFAULT_TYPE_INTEGER,
    "priority": DEFAULT_TYPE_INTEGER,
    "prodid": DEFAULT_TYPE_TEXT,
    "related-to": DEFAULT_TYPE_TEXT,
    "repeat": DEFAULT_TYPE_INTEGER,
    "rdate": {
      defaultType: "date-time",
      allowedTypes: ["date-time", "date", "period"],
      multiValue: ",",
      detectType: function(string) {
        if (string.indexOf("/") !== -1) {
          return "period";
        }
        return string.indexOf("T") === -1 ? "date" : "date-time";
      }
    },
    "recurrence-id": DEFAULT_TYPE_DATETIME_DATE,
    "resources": DEFAULT_TYPE_TEXT_MULTI,
    "request-status": DEFAULT_TYPE_TEXT_STRUCTURED,
    "rrule": DEFAULT_TYPE_RECUR,
    "sequence": DEFAULT_TYPE_INTEGER,
    "status": DEFAULT_TYPE_TEXT,
    "summary": DEFAULT_TYPE_TEXT,
    "transp": DEFAULT_TYPE_TEXT,
    "trigger": { defaultType: "duration", allowedTypes: ["duration", "date-time"] },
    "tzoffsetfrom": DEFAULT_TYPE_UTCOFFSET,
    "tzoffsetto": DEFAULT_TYPE_UTCOFFSET,
    "tzurl": DEFAULT_TYPE_URI,
    "tzid": DEFAULT_TYPE_TEXT,
    "tzname": DEFAULT_TYPE_TEXT
  });
  var vcardValues = extend(commonValues, {
    text: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
    uri: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
    date: {
      decorate: function(aValue) {
        return VCardTime.fromDateAndOrTimeString(aValue, "date");
      },
      undecorate: function(aValue) {
        return aValue.toString();
      },
      fromICAL: function(aValue) {
        if (aValue.length == 8) {
          return icalValues.date.fromICAL(aValue);
        } else if (aValue[0] == "-" && aValue.length == 6) {
          return aValue.slice(0, 4) + "-" + aValue.slice(4);
        } else {
          return aValue;
        }
      },
      toICAL: function(aValue) {
        if (aValue.length == 10) {
          return icalValues.date.toICAL(aValue);
        } else if (aValue[0] == "-" && aValue.length == 7) {
          return aValue.slice(0, 4) + aValue.slice(5);
        } else {
          return aValue;
        }
      }
    },
    time: {
      decorate: function(aValue) {
        return VCardTime.fromDateAndOrTimeString("T" + aValue, "time");
      },
      undecorate: function(aValue) {
        return aValue.toString();
      },
      fromICAL: function(aValue) {
        let splitzone = vcardValues.time._splitZone(aValue, true);
        let zone = splitzone[0], value = splitzone[1];
        if (value.length == 6) {
          value = value.slice(0, 2) + ":" + value.slice(2, 4) + ":" + value.slice(4, 6);
        } else if (value.length == 4 && value[0] != "-") {
          value = value.slice(0, 2) + ":" + value.slice(2, 4);
        } else if (value.length == 5) {
          value = value.slice(0, 3) + ":" + value.slice(3, 5);
        }
        if (zone.length == 5 && (zone[0] == "-" || zone[0] == "+")) {
          zone = zone.slice(0, 3) + ":" + zone.slice(3);
        }
        return value + zone;
      },
      toICAL: function(aValue) {
        let splitzone = vcardValues.time._splitZone(aValue);
        let zone = splitzone[0], value = splitzone[1];
        if (value.length == 8) {
          value = value.slice(0, 2) + value.slice(3, 5) + value.slice(6, 8);
        } else if (value.length == 5 && value[0] != "-") {
          value = value.slice(0, 2) + value.slice(3, 5);
        } else if (value.length == 6) {
          value = value.slice(0, 3) + value.slice(4, 6);
        }
        if (zone.length == 6 && (zone[0] == "-" || zone[0] == "+")) {
          zone = zone.slice(0, 3) + zone.slice(4);
        }
        return value + zone;
      },
      _splitZone: function(aValue, isFromIcal) {
        let lastChar = aValue.length - 1;
        let signChar = aValue.length - (isFromIcal ? 5 : 6);
        let sign = aValue[signChar];
        let zone, value;
        if (aValue[lastChar] == "Z") {
          zone = aValue[lastChar];
          value = aValue.slice(0, Math.max(0, lastChar));
        } else if (aValue.length > 6 && (sign == "-" || sign == "+")) {
          zone = aValue.slice(signChar);
          value = aValue.slice(0, Math.max(0, signChar));
        } else {
          zone = "";
          value = aValue;
        }
        return [zone, value];
      }
    },
    "date-time": {
      decorate: function(aValue) {
        return VCardTime.fromDateAndOrTimeString(aValue, "date-time");
      },
      undecorate: function(aValue) {
        return aValue.toString();
      },
      fromICAL: function(aValue) {
        return vcardValues["date-and-or-time"].fromICAL(aValue);
      },
      toICAL: function(aValue) {
        return vcardValues["date-and-or-time"].toICAL(aValue);
      }
    },
    "date-and-or-time": {
      decorate: function(aValue) {
        return VCardTime.fromDateAndOrTimeString(aValue, "date-and-or-time");
      },
      undecorate: function(aValue) {
        return aValue.toString();
      },
      fromICAL: function(aValue) {
        let parts = aValue.split("T");
        return (parts[0] ? vcardValues.date.fromICAL(parts[0]) : "") + (parts[1] ? "T" + vcardValues.time.fromICAL(parts[1]) : "");
      },
      toICAL: function(aValue) {
        let parts = aValue.split("T");
        return vcardValues.date.toICAL(parts[0]) + (parts[1] ? "T" + vcardValues.time.toICAL(parts[1]) : "");
      }
    },
    timestamp: icalValues["date-time"],
    "language-tag": {
      matches: /^[a-zA-Z0-9-]+$/
      // Could go with a more strict regex here
    },
    "phone-number": {
      fromICAL: function(aValue) {
        return Array.from(aValue).filter(function(c) {
          return c === "\\" ? void 0 : c;
        }).join("");
      },
      toICAL: function(aValue) {
        return Array.from(aValue).map(function(c) {
          return c === "," || c === ";" ? "\\" + c : c;
        }).join("");
      }
    }
  });
  var vcardParams = {
    "type": {
      valueType: "text",
      multiValue: ","
    },
    "value": {
      // since the value here is a 'type' lowercase is used.
      values: [
        "text",
        "uri",
        "date",
        "time",
        "date-time",
        "date-and-or-time",
        "timestamp",
        "boolean",
        "integer",
        "float",
        "utc-offset",
        "language-tag"
      ],
      allowXName: true,
      allowIanaToken: true
    }
  };
  var vcardProperties = extend(commonProperties, {
    "adr": { defaultType: "text", structuredValue: ";", multiValue: "," },
    "anniversary": DEFAULT_TYPE_DATE_ANDOR_TIME,
    "bday": DEFAULT_TYPE_DATE_ANDOR_TIME,
    "caladruri": DEFAULT_TYPE_URI,
    "caluri": DEFAULT_TYPE_URI,
    "clientpidmap": DEFAULT_TYPE_TEXT_STRUCTURED,
    "email": DEFAULT_TYPE_TEXT,
    "fburl": DEFAULT_TYPE_URI,
    "fn": DEFAULT_TYPE_TEXT,
    "gender": DEFAULT_TYPE_TEXT_STRUCTURED,
    "geo": DEFAULT_TYPE_URI,
    "impp": DEFAULT_TYPE_URI,
    "key": DEFAULT_TYPE_URI,
    "kind": DEFAULT_TYPE_TEXT,
    "lang": { defaultType: "language-tag" },
    "logo": DEFAULT_TYPE_URI,
    "member": DEFAULT_TYPE_URI,
    "n": { defaultType: "text", structuredValue: ";", multiValue: "," },
    "nickname": DEFAULT_TYPE_TEXT_MULTI,
    "note": DEFAULT_TYPE_TEXT,
    "org": { defaultType: "text", structuredValue: ";" },
    "photo": DEFAULT_TYPE_URI,
    "related": DEFAULT_TYPE_URI,
    "rev": { defaultType: "timestamp" },
    "role": DEFAULT_TYPE_TEXT,
    "sound": DEFAULT_TYPE_URI,
    "source": DEFAULT_TYPE_URI,
    "tel": { defaultType: "uri", allowedTypes: ["uri", "text"] },
    "title": DEFAULT_TYPE_TEXT,
    "tz": { defaultType: "text", allowedTypes: ["text", "utc-offset", "uri"] },
    "xml": DEFAULT_TYPE_TEXT
  });
  var vcard3Values = extend(commonValues, {
    binary: icalValues.binary,
    date: vcardValues.date,
    "date-time": vcardValues["date-time"],
    "phone-number": vcardValues["phone-number"],
    uri: icalValues.uri,
    text: icalValues.text,
    time: icalValues.time,
    vcard: icalValues.text,
    "utc-offset": {
      toICAL: function(aValue) {
        return aValue.slice(0, 7);
      },
      fromICAL: function(aValue) {
        return aValue.slice(0, 7);
      },
      decorate: function(aValue) {
        return UtcOffset.fromString(aValue);
      },
      undecorate: function(aValue) {
        return aValue.toString();
      }
    }
  });
  var vcard3Params = {
    "type": {
      valueType: "text",
      multiValue: ","
    },
    "value": {
      // since the value here is a 'type' lowercase is used.
      values: [
        "text",
        "uri",
        "date",
        "date-time",
        "phone-number",
        "time",
        "boolean",
        "integer",
        "float",
        "utc-offset",
        "vcard",
        "binary"
      ],
      allowXName: true,
      allowIanaToken: true
    }
  };
  var vcard3Properties = extend(commonProperties, {
    fn: DEFAULT_TYPE_TEXT,
    n: { defaultType: "text", structuredValue: ";", multiValue: "," },
    nickname: DEFAULT_TYPE_TEXT_MULTI,
    photo: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
    bday: {
      defaultType: "date-time",
      allowedTypes: ["date-time", "date"],
      detectType: function(string) {
        return string.indexOf("T") === -1 ? "date" : "date-time";
      }
    },
    adr: { defaultType: "text", structuredValue: ";", multiValue: "," },
    label: DEFAULT_TYPE_TEXT,
    tel: { defaultType: "phone-number" },
    email: DEFAULT_TYPE_TEXT,
    mailer: DEFAULT_TYPE_TEXT,
    tz: { defaultType: "utc-offset", allowedTypes: ["utc-offset", "text"] },
    geo: { defaultType: "float", structuredValue: ";" },
    title: DEFAULT_TYPE_TEXT,
    role: DEFAULT_TYPE_TEXT,
    logo: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
    agent: { defaultType: "vcard", allowedTypes: ["vcard", "text", "uri"] },
    org: DEFAULT_TYPE_TEXT_STRUCTURED,
    note: DEFAULT_TYPE_TEXT_MULTI,
    prodid: DEFAULT_TYPE_TEXT,
    rev: {
      defaultType: "date-time",
      allowedTypes: ["date-time", "date"],
      detectType: function(string) {
        return string.indexOf("T") === -1 ? "date" : "date-time";
      }
    },
    "sort-string": DEFAULT_TYPE_TEXT,
    sound: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
    class: DEFAULT_TYPE_TEXT,
    key: { defaultType: "binary", allowedTypes: ["binary", "text"] }
  });
  var icalSet = {
    name: "ical",
    value: icalValues,
    param: icalParams,
    property: icalProperties,
    propertyGroups: false
  };
  var vcardSet = {
    name: "vcard4",
    value: vcardValues,
    param: vcardParams,
    property: vcardProperties,
    propertyGroups: true
  };
  var vcard3Set = {
    name: "vcard3",
    value: vcard3Values,
    param: vcard3Params,
    property: vcard3Properties,
    propertyGroups: true
  };
  var design = {
    /**
     * Can be set to false to make the parser more lenient.
     */
    strict: true,
    /**
     * The default set for new properties and components if none is specified.
     * @type {designSet}
     */
    defaultSet: icalSet,
    /**
     * The default type for unknown properties
     * @type {String}
     */
    defaultType: "unknown",
    /**
     * Holds the design set for known top-level components
     *
     * @type {Object}
     * @property {designSet} vcard       vCard VCARD
     * @property {designSet} vevent      iCalendar VEVENT
     * @property {designSet} vtodo       iCalendar VTODO
     * @property {designSet} vjournal    iCalendar VJOURNAL
     * @property {designSet} valarm      iCalendar VALARM
     * @property {designSet} vtimezone   iCalendar VTIMEZONE
     * @property {designSet} daylight    iCalendar DAYLIGHT
     * @property {designSet} standard    iCalendar STANDARD
     *
     * @example
     * let propertyName = 'fn';
     * let componentDesign = ICAL.design.components.vcard;
     * let propertyDetails = componentDesign.property[propertyName];
     * if (propertyDetails.defaultType == 'text') {
     *   // Yep, sure is...
     * }
     */
    components: {
      vcard: vcardSet,
      vcard3: vcard3Set,
      vevent: icalSet,
      vtodo: icalSet,
      vjournal: icalSet,
      valarm: icalSet,
      vtimezone: icalSet,
      daylight: icalSet,
      standard: icalSet
    },
    /**
     * The design set for iCalendar (rfc5545/rfc7265) components.
     * @type {designSet}
     */
    icalendar: icalSet,
    /**
     * The design set for vCard (rfc6350/rfc7095) components.
     * @type {designSet}
     */
    vcard: vcardSet,
    /**
     * The design set for vCard (rfc2425/rfc2426/rfc7095) components.
     * @type {designSet}
     */
    vcard3: vcard3Set,
    /**
     * Gets the design set for the given component name.
     *
     * @param {String} componentName        The name of the component
     * @return {designSet}      The design set for the component
     */
    getDesignSet: function(componentName) {
      let isInDesign = componentName && componentName in design.components;
      return isInDesign ? design.components[componentName] : design.defaultSet;
    }
  };
  var LINE_ENDING = "\r\n";
  var DEFAULT_VALUE_TYPE = "unknown";
  var RFC6868_REPLACE_MAP = { '"': "^'", "\n": "^n", "^": "^^" };
  function stringify(jCal) {
    if (typeof jCal[0] == "string") {
      jCal = [jCal];
    }
    let i = 0;
    let len = jCal.length;
    let result = "";
    for (; i < len; i++) {
      result += stringify.component(jCal[i]) + LINE_ENDING;
    }
    return result;
  }
  stringify.component = function(component, designSet) {
    let name = component[0].toUpperCase();
    let result = "BEGIN:" + name + LINE_ENDING;
    let props = component[1];
    let propIdx = 0;
    let propLen = props.length;
    let designSetName = component[0];
    if (designSetName === "vcard" && component[1].length > 0 && !(component[1][0][0] === "version" && component[1][0][3] === "4.0")) {
      designSetName = "vcard3";
    }
    designSet = designSet || design.getDesignSet(designSetName);
    for (; propIdx < propLen; propIdx++) {
      result += stringify.property(props[propIdx], designSet) + LINE_ENDING;
    }
    let comps = component[2] || [];
    let compIdx = 0;
    let compLen = comps.length;
    for (; compIdx < compLen; compIdx++) {
      result += stringify.component(comps[compIdx], designSet) + LINE_ENDING;
    }
    result += "END:" + name;
    return result;
  };
  stringify.property = function(property, designSet, noFold) {
    let name = property[0].toUpperCase();
    let jsName = property[0];
    let params = property[1];
    if (!designSet) {
      designSet = design.defaultSet;
    }
    let groupName = params.group;
    let line;
    if (designSet.propertyGroups && groupName) {
      line = groupName.toUpperCase() + "." + name;
    } else {
      line = name;
    }
    for (let [paramName, value] of Object.entries(params)) {
      if (designSet.propertyGroups && paramName == "group") {
        continue;
      }
      let paramDesign = designSet.param[paramName];
      let multiValue2 = paramDesign && paramDesign.multiValue;
      if (multiValue2 && Array.isArray(value)) {
        value = value.map(function(val) {
          val = stringify._rfc6868Unescape(val);
          val = stringify.paramPropertyValue(val, paramDesign.multiValueSeparateDQuote);
          return val;
        });
        value = stringify.multiValue(value, multiValue2, "unknown", null, designSet);
      } else {
        value = stringify._rfc6868Unescape(value);
        value = stringify.paramPropertyValue(value);
      }
      line += ";" + paramName.toUpperCase() + "=" + value;
    }
    if (property.length === 3) {
      return line + ":";
    }
    let valueType = property[2];
    let propDetails;
    let multiValue = false;
    let structuredValue = false;
    let isDefault = false;
    if (jsName in designSet.property) {
      propDetails = designSet.property[jsName];
      if ("multiValue" in propDetails) {
        multiValue = propDetails.multiValue;
      }
      if ("structuredValue" in propDetails && Array.isArray(property[3])) {
        structuredValue = propDetails.structuredValue;
      }
      if ("defaultType" in propDetails) {
        if (valueType === propDetails.defaultType) {
          isDefault = true;
        }
      } else {
        if (valueType === DEFAULT_VALUE_TYPE) {
          isDefault = true;
        }
      }
    } else {
      if (valueType === DEFAULT_VALUE_TYPE) {
        isDefault = true;
      }
    }
    if (!isDefault) {
      line += ";VALUE=" + valueType.toUpperCase();
    }
    line += ":";
    if (multiValue && structuredValue) {
      line += stringify.multiValue(
        property[3],
        structuredValue,
        valueType,
        multiValue,
        designSet,
        structuredValue
      );
    } else if (multiValue) {
      line += stringify.multiValue(
        property.slice(3),
        multiValue,
        valueType,
        null,
        designSet,
        false
      );
    } else if (structuredValue) {
      line += stringify.multiValue(
        property[3],
        structuredValue,
        valueType,
        null,
        designSet,
        structuredValue
      );
    } else {
      line += stringify.value(property[3], valueType, designSet, false);
    }
    return noFold ? line : foldline(line);
  };
  stringify.paramPropertyValue = function(value, force) {
    if (!force && value.indexOf(",") === -1 && value.indexOf(":") === -1 && value.indexOf(";") === -1) {
      return value;
    }
    return '"' + value + '"';
  };
  stringify.multiValue = function(values, delim, type, innerMulti, designSet, structuredValue) {
    let result = "";
    let len = values.length;
    let i = 0;
    for (; i < len; i++) {
      if (innerMulti && Array.isArray(values[i])) {
        result += stringify.multiValue(values[i], innerMulti, type, null, designSet, structuredValue);
      } else {
        result += stringify.value(values[i], type, designSet, structuredValue);
      }
      if (i !== len - 1) {
        result += delim;
      }
    }
    return result;
  };
  stringify.value = function(value, type, designSet, structuredValue) {
    if (type in designSet.value && "toICAL" in designSet.value[type]) {
      return designSet.value[type].toICAL(value, structuredValue);
    }
    return value;
  };
  stringify._rfc6868Unescape = function(val) {
    return val.replace(/[\n^"]/g, function(x) {
      return RFC6868_REPLACE_MAP[x];
    });
  };
  var NAME_INDEX$1 = 0;
  var PROP_INDEX = 1;
  var TYPE_INDEX = 2;
  var VALUE_INDEX = 3;
  var Property = class _Property {
    /**
     * Create an {@link ICAL.Property} by parsing the passed iCalendar string.
     *
     * @param {String} str            The iCalendar string to parse
     * @param {designSet=} designSet  The design data to use for this property
     * @return {Property}             The created iCalendar property
     */
    static fromString(str, designSet) {
      return new _Property(parse.property(str, designSet));
    }
    /**
     * Creates a new ICAL.Property instance.
     *
     * It is important to note that mutations done in the wrapper directly mutate the jCal object used
     * to initialize.
     *
     * Can also be used to create new properties by passing the name of the property (as a String).
     *
     * @param {Array|String} jCal         Raw jCal representation OR the new name of the property
     * @param {Component=} parent         Parent component
     */
    constructor(jCal, parent) {
      this._parent = parent || null;
      if (typeof jCal === "string") {
        this.jCal = [jCal, {}, design.defaultType];
        this.jCal[TYPE_INDEX] = this.getDefaultType();
      } else {
        this.jCal = jCal;
      }
      this._updateType();
    }
    /**
     * The value type for this property
     * @type {String}
     */
    get type() {
      return this.jCal[TYPE_INDEX];
    }
    /**
     * The name of this property, in lowercase.
     * @type {String}
     */
    get name() {
      return this.jCal[NAME_INDEX$1];
    }
    /**
     * The parent component for this property.
     * @type {Component}
     */
    get parent() {
      return this._parent;
    }
    set parent(p) {
      let designSetChanged = !this._parent || p && p._designSet != this._parent._designSet;
      this._parent = p;
      if (this.type == design.defaultType && designSetChanged) {
        this.jCal[TYPE_INDEX] = this.getDefaultType();
        this._updateType();
      }
    }
    /**
     * The design set for this property, e.g. icalendar vs vcard
     *
     * @type {designSet}
     * @private
     */
    get _designSet() {
      return this.parent ? this.parent._designSet : design.defaultSet;
    }
    /**
     * Updates the type metadata from the current jCal type and design set.
     *
     * @private
     */
    _updateType() {
      let designSet = this._designSet;
      if (this.type in designSet.value) {
        if ("decorate" in designSet.value[this.type]) {
          this.isDecorated = true;
        } else {
          this.isDecorated = false;
        }
        if (this.name in designSet.property) {
          this.isMultiValue = "multiValue" in designSet.property[this.name];
          this.isStructuredValue = "structuredValue" in designSet.property[this.name];
        }
      }
    }
    /**
     * Hydrate a single value. The act of hydrating means turning the raw jCal
     * value into a potentially wrapped object, for example {@link ICAL.Time}.
     *
     * @private
     * @param {Number} index        The index of the value to hydrate
     * @return {?Object}             The decorated value.
     */
    _hydrateValue(index) {
      if (this._values && this._values[index]) {
        return this._values[index];
      }
      if (this.jCal.length <= VALUE_INDEX + index) {
        return null;
      }
      if (this.isDecorated) {
        if (!this._values) {
          this._values = [];
        }
        return this._values[index] = this._decorate(
          this.jCal[VALUE_INDEX + index]
        );
      } else {
        return this.jCal[VALUE_INDEX + index];
      }
    }
    /**
     * Decorate a single value, returning its wrapped object. This is used by
     * the hydrate function to actually wrap the value.
     *
     * @private
     * @param {?} value         The value to decorate
     * @return {Object}         The decorated value
     */
    _decorate(value) {
      return this._designSet.value[this.type].decorate(value, this);
    }
    /**
     * Undecorate a single value, returning its raw jCal data.
     *
     * @private
     * @param {Object} value         The value to undecorate
     * @return {?}                   The undecorated value
     */
    _undecorate(value) {
      return this._designSet.value[this.type].undecorate(value, this);
    }
    /**
     * Sets the value at the given index while also hydrating it. The passed
     * value can either be a decorated or undecorated value.
     *
     * @private
     * @param {?} value             The value to set
     * @param {Number} index        The index to set it at
     */
    _setDecoratedValue(value, index) {
      if (!this._values) {
        this._values = [];
      }
      if (typeof value === "object" && "icaltype" in value) {
        this.jCal[VALUE_INDEX + index] = this._undecorate(value);
        this._values[index] = value;
      } else {
        this.jCal[VALUE_INDEX + index] = value;
        this._values[index] = this._decorate(value);
      }
    }
    /**
     * Gets a parameter on the property.
     *
     * @param {String}        name   Parameter name (lowercase)
     * @return {Array|String}        Parameter value
     */
    getParameter(name) {
      if (name in this.jCal[PROP_INDEX]) {
        return this.jCal[PROP_INDEX][name];
      } else {
        return void 0;
      }
    }
    /**
     * Gets first parameter on the property.
     *
     * @param {String}        name   Parameter name (lowercase)
     * @return {String}        Parameter value
     */
    getFirstParameter(name) {
      let parameters = this.getParameter(name);
      if (Array.isArray(parameters)) {
        return parameters[0];
      }
      return parameters;
    }
    /**
     * Sets a parameter on the property.
     *
     * @param {String}       name     The parameter name
     * @param {Array|String} value    The parameter value
     */
    setParameter(name, value) {
      let lcname = name.toLowerCase();
      if (typeof value === "string" && lcname in this._designSet.param && "multiValue" in this._designSet.param[lcname]) {
        value = [value];
      }
      this.jCal[PROP_INDEX][name] = value;
    }
    /**
     * Removes a parameter
     *
     * @param {String} name     The parameter name
     */
    removeParameter(name) {
      delete this.jCal[PROP_INDEX][name];
    }
    /**
     * Get the default type based on this property's name.
     *
     * @return {String}     The default type for this property
     */
    getDefaultType() {
      let name = this.jCal[NAME_INDEX$1];
      let designSet = this._designSet;
      if (name in designSet.property) {
        let details = designSet.property[name];
        if ("defaultType" in details) {
          return details.defaultType;
        }
      }
      return design.defaultType;
    }
    /**
     * Sets type of property and clears out any existing values of the current
     * type.
     *
     * @param {String} type     New iCAL type (see design.*.values)
     */
    resetType(type) {
      this.removeAllValues();
      this.jCal[TYPE_INDEX] = type;
      this._updateType();
    }
    /**
     * Finds the first property value.
     *
     * @return {Binary | Duration | Period |
     * Recur | Time | UtcOffset | Geo | string | null}         First property value
     */
    getFirstValue() {
      return this._hydrateValue(0);
    }
    /**
     * Gets all values on the property.
     *
     * NOTE: this creates an array during each call.
     *
     * @return {Array}          List of values
     */
    getValues() {
      let len = this.jCal.length - VALUE_INDEX;
      if (len < 1) {
        return [];
      }
      let i = 0;
      let result = [];
      for (; i < len; i++) {
        result[i] = this._hydrateValue(i);
      }
      return result;
    }
    /**
     * Removes all values from this property
     */
    removeAllValues() {
      if (this._values) {
        this._values.length = 0;
      }
      this.jCal.length = 3;
    }
    /**
     * Sets the values of the property.  Will overwrite the existing values.
     * This can only be used for multi-value properties.
     *
     * @param {Array} values    An array of values
     */
    setValues(values) {
      if (!this.isMultiValue) {
        throw new Error(
          this.name + ": does not not support mulitValue.\noverride isMultiValue"
        );
      }
      let len = values.length;
      let i = 0;
      this.removeAllValues();
      if (len > 0 && typeof values[0] === "object" && "icaltype" in values[0]) {
        this.resetType(values[0].icaltype);
      }
      if (this.isDecorated) {
        for (; i < len; i++) {
          this._setDecoratedValue(values[i], i);
        }
      } else {
        for (; i < len; i++) {
          this.jCal[VALUE_INDEX + i] = values[i];
        }
      }
    }
    /**
     * Sets the current value of the property. If this is a multi-value
     * property, all other values will be removed.
     *
     * @param {String|Object} value     New property value.
     */
    setValue(value) {
      this.removeAllValues();
      if (typeof value === "object" && "icaltype" in value) {
        this.resetType(value.icaltype);
      }
      if (this.isDecorated) {
        this._setDecoratedValue(value, 0);
      } else {
        this.jCal[VALUE_INDEX] = value;
      }
    }
    /**
     * Returns the Object representation of this component. The returned object
     * is a live jCal object and should be cloned if modified.
     * @return {Object}
     */
    toJSON() {
      return this.jCal;
    }
    /**
     * The string representation of this component.
     * @return {String}
     */
    toICALString() {
      return stringify.property(
        this.jCal,
        this._designSet,
        true
      );
    }
  };
  var NAME_INDEX = 0;
  var PROPERTY_INDEX = 1;
  var COMPONENT_INDEX = 2;
  var PROPERTY_NAME_INDEX = 0;
  var PROPERTY_VALUE_INDEX = 3;
  var Component = class _Component {
    /**
     * Create an {@link ICAL.Component} by parsing the passed iCalendar string.
     *
     * @param {String} str        The iCalendar string to parse
     */
    static fromString(str) {
      return new _Component(parse.component(str));
    }
    /**
     * Creates a new Component instance.
     *
     * @param {Array|String} jCal         Raw jCal component data OR name of new
     *                                      component
     * @param {Component=} parent     Parent component to associate
     */
    constructor(jCal, parent) {
      if (typeof jCal === "string") {
        jCal = [jCal, [], []];
      }
      this.jCal = jCal;
      this.parent = parent || null;
      if (!this.parent && this.name === "vcalendar") {
        this._timezoneCache = /* @__PURE__ */ new Map();
      }
    }
    /**
     * Hydrated properties are inserted into the _properties array at the same
     * position as in the jCal array, so it is possible that the array contains
     * undefined values for unhydrdated properties. To avoid iterating the
     * array when checking if all properties have been hydrated, we save the
     * count here.
     *
     * @type {Number}
     * @private
     */
    _hydratedPropertyCount = 0;
    /**
     * The same count as for _hydratedPropertyCount, but for subcomponents
     *
     * @type {Number}
     * @private
     */
    _hydratedComponentCount = 0;
    /**
     * A cache of hydrated time zone objects which may be used by consumers, keyed
     * by time zone ID.
     *
     * @type {Map}
     * @private
     */
    _timezoneCache = null;
    /**
     * @private
     */
    _components = null;
    /**
     * @private
     */
    _properties = null;
    /**
     * The name of this component
     *
     * @type {String}
     */
    get name() {
      return this.jCal[NAME_INDEX];
    }
    /**
     * The design set for this component, e.g. icalendar vs vcard
     *
     * @type {designSet}
     * @private
     */
    get _designSet() {
      let parentDesign = this.parent && this.parent._designSet;
      if (!parentDesign && this.name == "vcard") {
        let versionProp = this.jCal[PROPERTY_INDEX]?.[0];
        if (versionProp && versionProp[PROPERTY_NAME_INDEX] == "version" && versionProp[PROPERTY_VALUE_INDEX] == "3.0") {
          return design.getDesignSet("vcard3");
        }
      }
      return parentDesign || design.getDesignSet(this.name);
    }
    /**
     * @private
     */
    _hydrateComponent(index) {
      if (!this._components) {
        this._components = [];
        this._hydratedComponentCount = 0;
      }
      if (this._components[index]) {
        return this._components[index];
      }
      let comp = new _Component(
        this.jCal[COMPONENT_INDEX][index],
        this
      );
      this._hydratedComponentCount++;
      return this._components[index] = comp;
    }
    /**
     * @private
     */
    _hydrateProperty(index) {
      if (!this._properties) {
        this._properties = [];
        this._hydratedPropertyCount = 0;
      }
      if (this._properties[index]) {
        return this._properties[index];
      }
      let prop = new Property(
        this.jCal[PROPERTY_INDEX][index],
        this
      );
      this._hydratedPropertyCount++;
      return this._properties[index] = prop;
    }
    /**
     * Finds first sub component, optionally filtered by name.
     *
     * @param {String=} name        Optional name to filter by
     * @return {?Component}     The found subcomponent
     */
    getFirstSubcomponent(name) {
      if (name) {
        let i = 0;
        let comps = this.jCal[COMPONENT_INDEX];
        let len = comps.length;
        for (; i < len; i++) {
          if (comps[i][NAME_INDEX] === name) {
            let result = this._hydrateComponent(i);
            return result;
          }
        }
      } else {
        if (this.jCal[COMPONENT_INDEX].length) {
          return this._hydrateComponent(0);
        }
      }
      return null;
    }
    /**
     * Finds all sub components, optionally filtering by name.
     *
     * @param {String=} name            Optional name to filter by
     * @return {Component[]}       The found sub components
     */
    getAllSubcomponents(name) {
      let jCalLen = this.jCal[COMPONENT_INDEX].length;
      let i = 0;
      if (name) {
        let comps = this.jCal[COMPONENT_INDEX];
        let result = [];
        for (; i < jCalLen; i++) {
          if (name === comps[i][NAME_INDEX]) {
            result.push(
              this._hydrateComponent(i)
            );
          }
        }
        return result;
      } else {
        if (!this._components || this._hydratedComponentCount !== jCalLen) {
          for (; i < jCalLen; i++) {
            this._hydrateComponent(i);
          }
        }
        return this._components || [];
      }
    }
    /**
     * Returns true when a named property exists.
     *
     * @param {String} name     The property name
     * @return {Boolean}        True, when property is found
     */
    hasProperty(name) {
      let props = this.jCal[PROPERTY_INDEX];
      let len = props.length;
      let i = 0;
      for (; i < len; i++) {
        if (props[i][NAME_INDEX] === name) {
          return true;
        }
      }
      return false;
    }
    /**
     * Finds the first property, optionally with the given name.
     *
     * @param {String=} name        Lowercase property name
     * @return {?Property}     The found property
     */
    getFirstProperty(name) {
      if (name) {
        let i = 0;
        let props = this.jCal[PROPERTY_INDEX];
        let len = props.length;
        for (; i < len; i++) {
          if (props[i][NAME_INDEX] === name) {
            let result = this._hydrateProperty(i);
            return result;
          }
        }
      } else {
        if (this.jCal[PROPERTY_INDEX].length) {
          return this._hydrateProperty(0);
        }
      }
      return null;
    }
    /**
     * Returns first property's value, if available.
     *
     * @param {String=} name                    Lowercase property name
     * @return {Binary | Duration | Period |
     * Recur | Time | UtcOffset | Geo | string | null}         The found property value.
     */
    getFirstPropertyValue(name) {
      let prop = this.getFirstProperty(name);
      if (prop) {
        return prop.getFirstValue();
      }
      return null;
    }
    /**
     * Get all properties in the component, optionally filtered by name.
     *
     * @param {String=} name        Lowercase property name
     * @return {Property[]}    List of properties
     */
    getAllProperties(name) {
      let jCalLen = this.jCal[PROPERTY_INDEX].length;
      let i = 0;
      if (name) {
        let props = this.jCal[PROPERTY_INDEX];
        let result = [];
        for (; i < jCalLen; i++) {
          if (name === props[i][NAME_INDEX]) {
            result.push(
              this._hydrateProperty(i)
            );
          }
        }
        return result;
      } else {
        if (!this._properties || this._hydratedPropertyCount !== jCalLen) {
          for (; i < jCalLen; i++) {
            this._hydrateProperty(i);
          }
        }
        return this._properties || [];
      }
    }
    /**
     * @private
     */
    _removeObjectByIndex(jCalIndex, cache, index) {
      cache = cache || [];
      if (cache[index]) {
        let obj = cache[index];
        if ("parent" in obj) {
          obj.parent = null;
        }
      }
      cache.splice(index, 1);
      this.jCal[jCalIndex].splice(index, 1);
    }
    /**
     * @private
     */
    _removeObject(jCalIndex, cache, nameOrObject) {
      let i = 0;
      let objects = this.jCal[jCalIndex];
      let len = objects.length;
      let cached = this[cache];
      if (typeof nameOrObject === "string") {
        for (; i < len; i++) {
          if (objects[i][NAME_INDEX] === nameOrObject) {
            this._removeObjectByIndex(jCalIndex, cached, i);
            return true;
          }
        }
      } else if (cached) {
        for (; i < len; i++) {
          if (cached[i] && cached[i] === nameOrObject) {
            this._removeObjectByIndex(jCalIndex, cached, i);
            return true;
          }
        }
      }
      return false;
    }
    /**
     * @private
     */
    _removeAllObjects(jCalIndex, cache, name) {
      let cached = this[cache];
      let objects = this.jCal[jCalIndex];
      let i = objects.length - 1;
      for (; i >= 0; i--) {
        if (!name || objects[i][NAME_INDEX] === name) {
          this._removeObjectByIndex(jCalIndex, cached, i);
        }
      }
    }
    /**
     * Adds a single sub component.
     *
     * @param {Component} component        The component to add
     * @return {Component}                 The passed in component
     */
    addSubcomponent(component) {
      if (!this._components) {
        this._components = [];
        this._hydratedComponentCount = 0;
      }
      if (component.parent) {
        component.parent.removeSubcomponent(component);
      }
      let idx = this.jCal[COMPONENT_INDEX].push(component.jCal);
      this._components[idx - 1] = component;
      this._hydratedComponentCount++;
      component.parent = this;
      return component;
    }
    /**
     * Removes a single component by name or the instance of a specific
     * component.
     *
     * @param {Component|String} nameOrComp    Name of component, or component
     * @return {Boolean}                            True when comp is removed
     */
    removeSubcomponent(nameOrComp) {
      let removed = this._removeObject(COMPONENT_INDEX, "_components", nameOrComp);
      if (removed) {
        this._hydratedComponentCount--;
      }
      return removed;
    }
    /**
     * Removes all components or (if given) all components by a particular
     * name.
     *
     * @param {String=} name            Lowercase component name
     */
    removeAllSubcomponents(name) {
      let removed = this._removeAllObjects(COMPONENT_INDEX, "_components", name);
      this._hydratedComponentCount = 0;
      return removed;
    }
    /**
     * Adds an {@link ICAL.Property} to the component.
     *
     * @param {Property} property      The property to add
     * @return {Property}              The passed in property
     */
    addProperty(property) {
      if (!(property instanceof Property)) {
        throw new TypeError("must be instance of ICAL.Property");
      }
      if (!this._properties) {
        this._properties = [];
        this._hydratedPropertyCount = 0;
      }
      if (property.parent) {
        property.parent.removeProperty(property);
      }
      let idx = this.jCal[PROPERTY_INDEX].push(property.jCal);
      this._properties[idx - 1] = property;
      this._hydratedPropertyCount++;
      property.parent = this;
      return property;
    }
    /**
     * Helper method to add a property with a value to the component.
     *
     * @param {String}               name         Property name to add
     * @param {String|Number|Object} value        Property value
     * @return {Property}                    The created property
     */
    addPropertyWithValue(name, value) {
      let prop = new Property(name);
      prop.setValue(value);
      this.addProperty(prop);
      return prop;
    }
    /**
     * Helper method that will update or create a property of the given name
     * and sets its value. If multiple properties with the given name exist,
     * only the first is updated.
     *
     * @param {String}               name         Property name to update
     * @param {String|Number|Object} value        Property value
     * @return {Property}                    The created property
     */
    updatePropertyWithValue(name, value) {
      let prop = this.getFirstProperty(name);
      if (prop) {
        prop.setValue(value);
      } else {
        prop = this.addPropertyWithValue(name, value);
      }
      return prop;
    }
    /**
     * Removes a single property by name or the instance of the specific
     * property.
     *
     * @param {String|Property} nameOrProp     Property name or instance to remove
     * @return {Boolean}                            True, when deleted
     */
    removeProperty(nameOrProp) {
      let removed = this._removeObject(PROPERTY_INDEX, "_properties", nameOrProp);
      if (removed) {
        this._hydratedPropertyCount--;
      }
      return removed;
    }
    /**
     * Removes all properties associated with this component, optionally
     * filtered by name.
     *
     * @param {String=} name        Lowercase property name
     * @return {Boolean}            True, when deleted
     */
    removeAllProperties(name) {
      let removed = this._removeAllObjects(PROPERTY_INDEX, "_properties", name);
      this._hydratedPropertyCount = 0;
      return removed;
    }
    /**
     * Returns the Object representation of this component. The returned object
     * is a live jCal object and should be cloned if modified.
     * @return {Object}
     */
    toJSON() {
      return this.jCal;
    }
    /**
     * The string representation of this component.
     * @return {String}
     */
    toString() {
      return stringify.component(
        this.jCal,
        this._designSet
      );
    }
    /**
     * Retrieve a time zone definition from the component tree, if any is present.
     * If the tree contains no time zone definitions or the TZID cannot be
     * matched, returns null.
     *
     * @param {String} tzid     The ID of the time zone to retrieve
     * @return {Timezone}  The time zone corresponding to the ID, or null
     */
    getTimeZoneByID(tzid) {
      if (this.parent) {
        return this.parent.getTimeZoneByID(tzid);
      }
      if (!this._timezoneCache) {
        return null;
      }
      if (this._timezoneCache.has(tzid)) {
        return this._timezoneCache.get(tzid);
      }
      const zones2 = this.getAllSubcomponents("vtimezone");
      for (const zone of zones2) {
        if (zone.getFirstProperty("tzid").getFirstValue() === tzid) {
          const hydratedZone = new Timezone({
            component: zone,
            tzid
          });
          this._timezoneCache.set(tzid, hydratedZone);
          return hydratedZone;
        }
      }
      return null;
    }
  };
  var RecurExpansion = class {
    /**
     * Creates a new ICAL.RecurExpansion instance.
     *
     * The options object can be filled with the specified initial values. It can also contain
     * additional members, as a result of serializing a previous expansion state, as shown in the
     * example.
     *
     * @param {Object} options
     *        Recurrence expansion options
     * @param {Time} options.dtstart
     *        Start time of the event
     * @param {Component=} options.component
     *        Component for expansion, required if not resuming.
     */
    constructor(options) {
      this.ruleDates = [];
      this.exDates = [];
      this.fromData(options);
    }
    /**
     * True when iteration is fully completed.
     * @type {Boolean}
     */
    complete = false;
    /**
     * Array of rrule iterators.
     *
     * @type {RecurIterator[]}
     * @private
     */
    ruleIterators = null;
    /**
     * Array of rdate instances.
     *
     * @type {Time[]}
     * @private
     */
    ruleDates = null;
    /**
     * Array of exdate instances.
     *
     * @type {Time[]}
     * @private
     */
    exDates = null;
    /**
     * Current position in ruleDates array.
     * @type {Number}
     * @private
     */
    ruleDateInc = 0;
    /**
     * Current position in exDates array
     * @type {Number}
     * @private
     */
    exDateInc = 0;
    /**
     * Current negative date.
     *
     * @type {Time}
     * @private
     */
    exDate = null;
    /**
     * Current additional date.
     *
     * @type {Time}
     * @private
     */
    ruleDate = null;
    /**
     * Start date of recurring rules.
     *
     * @type {Time}
     */
    dtstart = null;
    /**
     * Last expanded time
     *
     * @type {Time}
     */
    last = null;
    /**
     * Initialize the recurrence expansion from the data object. The options
     * object may also contain additional members, see the
     * {@link ICAL.RecurExpansion constructor} for more details.
     *
     * @param {Object} options
     *        Recurrence expansion options
     * @param {Time} options.dtstart
     *        Start time of the event
     * @param {Component=} options.component
     *        Component for expansion, required if not resuming.
     */
    fromData(options) {
      let start2 = formatClassType(options.dtstart, Time);
      if (!start2) {
        throw new Error(".dtstart (ICAL.Time) must be given");
      } else {
        this.dtstart = start2;
      }
      if (options.component) {
        this._init(options.component);
      } else {
        this.last = formatClassType(options.last, Time) || start2.clone();
        if (!options.ruleIterators) {
          throw new Error(".ruleIterators or .component must be given");
        }
        this.ruleIterators = options.ruleIterators.map(function(item) {
          return formatClassType(item, RecurIterator);
        });
        this.ruleDateInc = options.ruleDateInc;
        this.exDateInc = options.exDateInc;
        if (options.ruleDates) {
          this.ruleDates = options.ruleDates.map((item) => formatClassType(item, Time));
          this.ruleDate = this.ruleDates[this.ruleDateInc];
        }
        if (options.exDates) {
          this.exDates = options.exDates.map((item) => formatClassType(item, Time));
          this.exDate = this.exDates[this.exDateInc];
        }
        if (typeof options.complete !== "undefined") {
          this.complete = options.complete;
        }
      }
    }
    /**
     * Compare two ICAL.Time objects.  When the second parameter is a DATE and the first parameter is
     * DATE-TIME, strip the time and compare only the days.
     *
     * @private
     * @param {Time} a   The one object to compare
     * @param {Time} b   The other object to compare
     */
    _compare_special(a, b) {
      if (!a.isDate && b.isDate)
        return new Time({ year: a.year, month: a.month, day: a.day }).compare(b);
      return a.compare(b);
    }
    /**
     * Retrieve the next occurrence in the series.
     * @return {Time}
     */
    next() {
      let iter;
      let next;
      let compare;
      let maxTries = 500;
      let currentTry = 0;
      while (true) {
        if (currentTry++ > maxTries) {
          throw new Error(
            "max tries have occurred, rule may be impossible to fulfill."
          );
        }
        next = this.ruleDate;
        iter = this._nextRecurrenceIter(this.last);
        if (!next && !iter) {
          this.complete = true;
          break;
        }
        if (!next || iter && next.compare(iter.last) > 0) {
          next = iter.last.clone();
          iter.next();
        }
        if (this.ruleDate === next) {
          this._nextRuleDay();
        }
        this.last = next;
        if (this.exDate) {
          compare = this._compare_special(this.last, this.exDate);
          if (compare > 0) {
            this._nextExDay();
          }
          if (compare === 0) {
            this._nextExDay();
            continue;
          }
        }
        return this.last;
      }
    }
    /**
     * Converts object into a serialize-able format. This format can be passed
     * back into the expansion to resume iteration.
     * @return {Object}
     */
    toJSON() {
      function toJSON(item) {
        return item.toJSON();
      }
      let result = /* @__PURE__ */ Object.create(null);
      result.ruleIterators = this.ruleIterators.map(toJSON);
      if (this.ruleDates) {
        result.ruleDates = this.ruleDates.map(toJSON);
      }
      if (this.exDates) {
        result.exDates = this.exDates.map(toJSON);
      }
      result.ruleDateInc = this.ruleDateInc;
      result.exDateInc = this.exDateInc;
      result.last = this.last.toJSON();
      result.dtstart = this.dtstart.toJSON();
      result.complete = this.complete;
      return result;
    }
    /**
     * Extract all dates from the properties in the given component. The
     * properties will be filtered by the property name.
     *
     * @private
     * @param {Component} component             The component to search in
     * @param {String} propertyName             The property name to search for
     * @return {Time[]}                         The extracted dates.
     */
    _extractDates(component, propertyName) {
      let result = [];
      let props = component.getAllProperties(propertyName);
      for (let i = 0, len = props.length; i < len; i++) {
        for (let prop of props[i].getValues()) {
          let idx = binsearchInsert(
            result,
            prop,
            (a, b) => a.compare(b)
          );
          result.splice(idx, 0, prop);
        }
      }
      return result;
    }
    /**
     * Initialize the recurrence expansion.
     *
     * @private
     * @param {Component} component    The component to initialize from.
     */
    _init(component) {
      this.ruleIterators = [];
      this.last = this.dtstart.clone();
      if (!component.hasProperty("rdate") && !component.hasProperty("rrule") && !component.hasProperty("recurrence-id")) {
        this.ruleDate = this.last.clone();
        this.complete = true;
        return;
      }
      if (component.hasProperty("rdate")) {
        this.ruleDates = this._extractDates(component, "rdate");
        if (this.ruleDates[0] && this.ruleDates[0].compare(this.dtstart) < 0) {
          this.ruleDateInc = 0;
          this.last = this.ruleDates[0].clone();
        } else {
          this.ruleDateInc = binsearchInsert(
            this.ruleDates,
            this.last,
            (a, b) => a.compare(b)
          );
        }
        this.ruleDate = this.ruleDates[this.ruleDateInc];
      }
      if (component.hasProperty("rrule")) {
        let rules = component.getAllProperties("rrule");
        let i = 0;
        let len = rules.length;
        let rule;
        let iter;
        for (; i < len; i++) {
          rule = rules[i].getFirstValue();
          iter = rule.iterator(this.dtstart);
          this.ruleIterators.push(iter);
          iter.next();
        }
      }
      if (component.hasProperty("exdate")) {
        this.exDates = this._extractDates(component, "exdate");
        this.exDateInc = binsearchInsert(
          this.exDates,
          this.last,
          this._compare_special
        );
        this.exDate = this.exDates[this.exDateInc];
      }
    }
    /**
     * Advance to the next exdate
     * @private
     */
    _nextExDay() {
      this.exDate = this.exDates[++this.exDateInc];
    }
    /**
     * Advance to the next rule date
     * @private
     */
    _nextRuleDay() {
      this.ruleDate = this.ruleDates[++this.ruleDateInc];
    }
    /**
     * Find and return the recurrence rule with the most recent event and
     * return it.
     *
     * @private
     * @return {?RecurIterator}    Found iterator.
     */
    _nextRecurrenceIter() {
      let iters = this.ruleIterators;
      if (iters.length === 0) {
        return null;
      }
      let len = iters.length;
      let iter;
      let iterTime;
      let iterIdx = 0;
      let chosenIter;
      for (; iterIdx < len; iterIdx++) {
        iter = iters[iterIdx];
        iterTime = iter.last;
        if (iter.completed) {
          len--;
          if (iterIdx !== 0) {
            iterIdx--;
          }
          iters.splice(iterIdx, 1);
          continue;
        }
        if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
          chosenIter = iter;
        }
      }
      return chosenIter;
    }
  };
  var Event2 = class _Event {
    /**
     * Creates a new ICAL.Event instance.
     *
     * @param {Component=} component              The ICAL.Component to base this event on
     * @param {Object} [options]                  Options for this event
     * @param {Boolean=} options.strictExceptions  When true, will verify exceptions are related by
     *                                              their UUID
     * @param {Array<Component|Event>=} options.exceptions
     *          Exceptions to this event, either as components or events. If not
     *            specified exceptions will automatically be set in relation of
     *            component's parent
     */
    constructor(component, options) {
      if (!(component instanceof Component)) {
        options = component;
        component = null;
      }
      if (component) {
        this.component = component;
      } else {
        this.component = new Component("vevent");
      }
      this._rangeExceptionCache = /* @__PURE__ */ Object.create(null);
      this.exceptions = /* @__PURE__ */ Object.create(null);
      this.rangeExceptions = [];
      if (options && options.strictExceptions) {
        this.strictExceptions = options.strictExceptions;
      }
      if (options && options.exceptions) {
        options.exceptions.forEach(this.relateException, this);
      } else if (this.component.parent && !this.isRecurrenceException()) {
        this.component.parent.getAllSubcomponents("vevent").forEach(function(event) {
          if (event.hasProperty("recurrence-id")) {
            this.relateException(event);
          }
        }, this);
      }
    }
    static THISANDFUTURE = "THISANDFUTURE";
    /**
     * List of related event exceptions.
     *
     * @type {Event[]}
     */
    exceptions = null;
    /**
     * When true, will verify exceptions are related by their UUID.
     *
     * @type {Boolean}
     */
    strictExceptions = false;
    /**
     * Relates a given event exception to this object.  If the given component
     * does not share the UID of this event it cannot be related and will throw
     * an exception.
     *
     * If this component is an exception it cannot have other exceptions
     * related to it.
     *
     * @param {Component|Event} obj       Component or event
     */
    relateException(obj) {
      if (this.isRecurrenceException()) {
        throw new Error("cannot relate exception to exceptions");
      }
      if (obj instanceof Component) {
        obj = new _Event(obj);
      }
      if (this.strictExceptions && obj.uid !== this.uid) {
        throw new Error("attempted to relate unrelated exception");
      }
      let id = obj.recurrenceId.toString();
      this.exceptions[id] = obj;
      if (obj.modifiesFuture()) {
        let item = [
          obj.recurrenceId.toUnixTime(),
          id
        ];
        let idx = binsearchInsert(
          this.rangeExceptions,
          item,
          compareRangeException
        );
        this.rangeExceptions.splice(idx, 0, item);
      }
    }
    /**
     * Checks if this record is an exception and has the RANGE=THISANDFUTURE
     * value.
     *
     * @return {Boolean}        True, when exception is within range
     */
    modifiesFuture() {
      if (!this.component.hasProperty("recurrence-id")) {
        return false;
      }
      let range = this.component.getFirstProperty("recurrence-id").getParameter("range");
      return range === _Event.THISANDFUTURE;
    }
    /**
     * Finds the range exception nearest to the given date.
     *
     * @param {Time} time   usually an occurrence time of an event
     * @return {?Event}     the related event/exception or null
     */
    findRangeException(time) {
      if (!this.rangeExceptions.length) {
        return null;
      }
      let utc = time.toUnixTime();
      let idx = binsearchInsert(
        this.rangeExceptions,
        [utc],
        compareRangeException
      );
      idx -= 1;
      if (idx < 0) {
        return null;
      }
      let rangeItem = this.rangeExceptions[idx];
      if (utc < rangeItem[0]) {
        return null;
      }
      return rangeItem[1];
    }
    /**
     * Returns the occurrence details based on its start time.  If the
     * occurrence has an exception will return the details for that exception.
     *
     * NOTE: this method is intend to be used in conjunction
     *       with the {@link ICAL.Event#iterator iterator} method.
     *
     * @param {Time} occurrence               time occurrence
     * @return {occurrenceDetails}            Information about the occurrence
     */
    getOccurrenceDetails(occurrence) {
      let id = occurrence.toString();
      let utcId = occurrence.convertToZone(Timezone.utcTimezone).toString();
      let item;
      let result = {
        //XXX: Clone?
        recurrenceId: occurrence
      };
      if (id in this.exceptions) {
        item = result.item = this.exceptions[id];
        result.startDate = item.startDate;
        result.endDate = item.endDate;
        result.item = item;
      } else if (utcId in this.exceptions) {
        item = this.exceptions[utcId];
        result.startDate = item.startDate;
        result.endDate = item.endDate;
        result.item = item;
      } else {
        let rangeExceptionId = this.findRangeException(
          occurrence
        );
        let end2;
        if (rangeExceptionId) {
          let exception = this.exceptions[rangeExceptionId];
          result.item = exception;
          let startDiff = this._rangeExceptionCache[rangeExceptionId];
          if (!startDiff) {
            let original = exception.recurrenceId.clone();
            let newStart = exception.startDate.clone();
            original.zone = newStart.zone;
            startDiff = newStart.subtractDate(original);
            this._rangeExceptionCache[rangeExceptionId] = startDiff;
          }
          let start2 = occurrence.clone();
          start2.zone = exception.startDate.zone;
          start2.addDuration(startDiff);
          end2 = start2.clone();
          end2.addDuration(exception.duration);
          result.startDate = start2;
          result.endDate = end2;
        } else {
          end2 = occurrence.clone();
          end2.addDuration(this.duration);
          result.endDate = end2;
          result.startDate = occurrence;
          result.item = this;
        }
      }
      return result;
    }
    /**
     * Builds a recur expansion instance for a specific point in time (defaults
     * to startDate).
     *
     * @param {Time=} startTime     Starting point for expansion
     * @return {RecurExpansion}    Expansion object
     */
    iterator(startTime) {
      return new RecurExpansion({
        component: this.component,
        dtstart: startTime || this.startDate
      });
    }
    /**
     * Checks if the event is recurring
     *
     * @return {Boolean}        True, if event is recurring
     */
    isRecurring() {
      let comp = this.component;
      return comp.hasProperty("rrule") || comp.hasProperty("rdate");
    }
    /**
     * Checks if the event describes a recurrence exception. See
     * {@tutorial terminology} for details.
     *
     * @return {Boolean}    True, if the event describes a recurrence exception
     */
    isRecurrenceException() {
      return this.component.hasProperty("recurrence-id");
    }
    /**
     * Returns the types of recurrences this event may have.
     *
     * Returned as an object with the following possible keys:
     *
     *    - YEARLY
     *    - MONTHLY
     *    - WEEKLY
     *    - DAILY
     *    - MINUTELY
     *    - SECONDLY
     *
     * @return {Object.<frequencyValues, Boolean>}
     *          Object of recurrence flags
     */
    getRecurrenceTypes() {
      let rules = this.component.getAllProperties("rrule");
      let i = 0;
      let len = rules.length;
      let result = /* @__PURE__ */ Object.create(null);
      for (; i < len; i++) {
        let value = rules[i].getFirstValue();
        result[value.freq] = true;
      }
      return result;
    }
    /**
     * The uid of this event
     * @type {String}
     */
    get uid() {
      return this._firstProp("uid");
    }
    set uid(value) {
      this._setProp("uid", value);
    }
    /**
     * The start date
     * @type {Time}
     */
    get startDate() {
      return this._firstProp("dtstart");
    }
    set startDate(value) {
      this._setTime("dtstart", value);
    }
    /**
     * The end date. This can be the result directly from the property, or the
     * end date calculated from start date and duration. Setting the property
     * will remove any duration properties.
     * @type {Time}
     */
    get endDate() {
      let endDate = this._firstProp("dtend");
      if (!endDate) {
        let duration = this._firstProp("duration");
        endDate = this.startDate.clone();
        if (duration) {
          endDate.addDuration(duration);
        } else if (endDate.isDate) {
          endDate.day += 1;
        }
      }
      return endDate;
    }
    set endDate(value) {
      if (this.component.hasProperty("duration")) {
        this.component.removeProperty("duration");
      }
      this._setTime("dtend", value);
    }
    /**
     * The duration. This can be the result directly from the property, or the
     * duration calculated from start date and end date. Setting the property
     * will remove any `dtend` properties.
     * @type {Duration}
     */
    get duration() {
      let duration = this._firstProp("duration");
      if (!duration) {
        return this.endDate.subtractDateTz(this.startDate);
      }
      return duration;
    }
    set duration(value) {
      if (this.component.hasProperty("dtend")) {
        this.component.removeProperty("dtend");
      }
      this._setProp("duration", value);
    }
    /**
     * The location of the event.
     * @type {String}
     */
    get location() {
      return this._firstProp("location");
    }
    set location(value) {
      this._setProp("location", value);
    }
    /**
     * The attendees in the event
     * @type {Property[]}
     */
    get attendees() {
      return this.component.getAllProperties("attendee");
    }
    /**
     * The event summary
     * @type {String}
     */
    get summary() {
      return this._firstProp("summary");
    }
    set summary(value) {
      this._setProp("summary", value);
    }
    /**
     * The event description.
     * @type {String}
     */
    get description() {
      return this._firstProp("description");
    }
    set description(value) {
      this._setProp("description", value);
    }
    /**
     * The event color from [rfc7986](https://datatracker.ietf.org/doc/html/rfc7986)
     * @type {String}
     */
    get color() {
      return this._firstProp("color");
    }
    set color(value) {
      this._setProp("color", value);
    }
    /**
     * The organizer value as an uri. In most cases this is a mailto: uri, but
     * it can also be something else, like urn:uuid:...
     * @type {String}
     */
    get organizer() {
      return this._firstProp("organizer");
    }
    set organizer(value) {
      this._setProp("organizer", value);
    }
    /**
     * The sequence value for this event. Used for scheduling
     * see {@tutorial terminology}.
     * @type {Number}
     */
    get sequence() {
      return this._firstProp("sequence");
    }
    set sequence(value) {
      this._setProp("sequence", value);
    }
    /**
     * The recurrence id for this event. See {@tutorial terminology} for details.
     * @type {Time}
     */
    get recurrenceId() {
      return this._firstProp("recurrence-id");
    }
    set recurrenceId(value) {
      this._setTime("recurrence-id", value);
    }
    /**
     * Set/update a time property's value.
     * This will also update the TZID of the property.
     *
     * TODO: this method handles the case where we are switching
     * from a known timezone to an implied timezone (one without TZID).
     * This does _not_ handle the case of moving between a known
     *  (by TimezoneService) timezone to an unknown timezone...
     *
     * We will not add/remove/update the VTIMEZONE subcomponents
     *  leading to invalid ICAL data...
     * @private
     * @param {String} propName     The property name
     * @param {Time} time           The time to set
     */
    _setTime(propName, time) {
      let prop = this.component.getFirstProperty(propName);
      if (!prop) {
        prop = new Property(propName);
        this.component.addProperty(prop);
      }
      if (time.zone === Timezone.localTimezone || time.zone === Timezone.utcTimezone) {
        prop.removeParameter("tzid");
      } else {
        prop.setParameter("tzid", time.zone.tzid);
      }
      prop.setValue(time);
    }
    _setProp(name, value) {
      this.component.updatePropertyWithValue(name, value);
    }
    _firstProp(name) {
      return this.component.getFirstPropertyValue(name);
    }
    /**
     * The string representation of this event.
     * @return {String}
     */
    toString() {
      return this.component.toString();
    }
  };
  function compareRangeException(a, b) {
    if (a[0] > b[0])
      return 1;
    if (b[0] > a[0])
      return -1;
    return 0;
  }
  var ComponentParser = class {
    /**
     * Creates a new ICAL.ComponentParser instance.
     *
     * @param {Object=} options                   Component parser options
     * @param {Boolean} options.parseEvent        Whether events should be parsed
     * @param {Boolean} options.parseTimezeone    Whether timezones should be parsed
     */
    constructor(options) {
      if (typeof options === "undefined") {
        options = {};
      }
      for (let [key, value] of Object.entries(options)) {
        this[key] = value;
      }
    }
    /**
     * When true, parse events
     *
     * @type {Boolean}
     */
    parseEvent = true;
    /**
     * When true, parse timezones
     *
     * @type {Boolean}
     */
    parseTimezone = true;
    /* SAX like events here for reference */
    /**
     * Fired when parsing is complete
     * @callback
     */
    oncomplete = (
      /* c8 ignore next */
      function() {
      }
    );
    /**
     * Fired if an error occurs during parsing.
     *
     * @callback
     * @param {Error} err details of error
     */
    onerror = (
      /* c8 ignore next */
      function(err) {
      }
    );
    /**
     * Fired when a top level component (VTIMEZONE) is found
     *
     * @callback
     * @param {Timezone} component     Timezone object
     */
    ontimezone = (
      /* c8 ignore next */
      function(component) {
      }
    );
    /**
     * Fired when a top level component (VEVENT) is found.
     *
     * @callback
     * @param {Event} component    Top level component
     */
    onevent = (
      /* c8 ignore next */
      function(component) {
      }
    );
    /**
     * Process a string or parse ical object.  This function itself will return
     * nothing but will start the parsing process.
     *
     * Events must be registered prior to calling this method.
     *
     * @param {Component|String|Object} ical      The component to process,
     *        either in its final form, as a jCal Object, or string representation
     */
    process(ical) {
      if (typeof ical === "string") {
        ical = parse(ical);
      }
      if (!(ical instanceof Component)) {
        ical = new Component(ical);
      }
      let components = ical.getAllSubcomponents();
      let i = 0;
      let len = components.length;
      let component;
      for (; i < len; i++) {
        component = components[i];
        switch (component.name) {
          case "vtimezone":
            if (this.parseTimezone) {
              let tzid = component.getFirstPropertyValue("tzid");
              if (tzid) {
                this.ontimezone(new Timezone({
                  tzid,
                  component
                }));
              }
            }
            break;
          case "vevent":
            if (this.parseEvent) {
              this.onevent(new Event2(component));
            }
            break;
          default:
            continue;
        }
      }
      this.oncomplete();
    }
  };
  var ICALmodule = {
    /**
     * The number of characters before iCalendar line folding should occur
     * @type {Number}
     * @default 75
     */
    foldLength: 75,
    debug: false,
    /**
     * The character(s) to be used for a newline. The default value is provided by
     * rfc5545.
     * @type {String}
     * @default "\r\n"
     */
    newLineChar: "\r\n",
    Binary,
    Component,
    ComponentParser,
    Duration,
    Event: Event2,
    Period,
    Property,
    Recur,
    RecurExpansion,
    RecurIterator,
    Time,
    Timezone,
    TimezoneService,
    UtcOffset,
    VCardTime,
    parse,
    stringify,
    design,
    helpers
  };

  // src/popup.ts
  var adapters;
  var icsGenerator;
  var availableModels = [];
  var selectedModel = null;
  var reviewData = null;
  var currentTabId = null;
  var TabStateManager = class {
    tabId = null;
    stateKey = null;
    async initialize() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.tabId = tab.id;
        this.stateKey = `tab_${this.tabId}_state`;
        currentTabId = this.tabId;
        await this.restoreState();
        window.addEventListener("beforeunload", () => this.saveState());
      } catch (error) {
        console.error("Error initializing tab state manager:", error);
      }
    }
    async saveState() {
      if (!this.tabId || !this.stateKey)
        return;
      const instructionsInput = document.getElementById("instructions");
      const modelSelect = document.getElementById("model-select");
      const tentativeToggle = document.getElementById("tentative-toggle");
      const multidayToggle = document.getElementById("multiday-toggle");
      const state = {
        formData: {
          instructions: instructionsInput?.value || "",
          model: modelSelect?.value || "",
          tentative: tentativeToggle?.checked || false,
          multiday: multidayToggle?.checked || false,
          preextract: preextractToggle?.checked ?? true,
          reviewOption: document.querySelector('input[name="review-option"]:checked')?.value || "direct"
        },
        processingState: {
          isProcessing: document.getElementById("processingView")?.style.display === "block",
          hasResults: document.getElementById("responseData")?.textContent || ""
        },
        timestamp: Date.now()
      };
      try {
        await chrome.storage.local.set({ [this.stateKey]: state });
        console.log("Saved state for tab", this.tabId);
      } catch (error) {
        console.error("Error saving tab state:", error);
      }
    }
    async restoreState() {
      if (!this.tabId || !this.stateKey)
        return;
      try {
        const result = await chrome.storage.local.get([this.stateKey]);
        const state = result[this.stateKey];
        if (state && Date.now() - state.timestamp < 36e5) {
          const form = state.formData;
          const instructionsInput = document.getElementById("instructions");
          const modelSelect = document.getElementById("model-select");
          const tentativeToggle = document.getElementById("tentative-toggle");
          const multidayToggle = document.getElementById("multiday-toggle");
          const preextractToggle2 = document.getElementById("preextract-toggle");
          if (form.instructions && instructionsInput)
            instructionsInput.value = form.instructions;
          if (form.model && modelSelect)
            modelSelect.value = form.model;
          if (tentativeToggle)
            tentativeToggle.checked = form.tentative;
          if (multidayToggle)
            multidayToggle.checked = form.multiday;
          if (preextractToggle2 && typeof form.preextract === "boolean")
            preextractToggle2.checked = form.preextract;
          if (form.reviewOption) {
            const radio = document.querySelector(`input[name="review-option"][value="${form.reviewOption}"]`);
            if (radio)
              radio.checked = true;
          }
          console.log("Restored state for tab", this.tabId);
        }
      } catch (error) {
        console.error("Error restoring tab state:", error);
      }
    }
  };
  document.addEventListener("DOMContentLoaded", async function() {
    adapters = createBrowserAdapters();
    icsGenerator = new BrowserIcsGenerator();
    const isInIframe = window.self !== window.top;
    const tabStateManager = new TabStateManager();
    await tabStateManager.initialize();
    const statusDiv = document.getElementById("status");
    const reviewStatusDiv = document.getElementById("review-status");
    const settingsSection = document.getElementById("settings-section");
    const formSection = document.getElementById("form-section");
    const reviewSection = document.getElementById("review-section");
    const processingView = document.getElementById("processingView");
    const instructionsInput = document.getElementById("instructions");
    const modelSelect = document.getElementById("model-select");
    const preextractToggle2 = document.getElementById("preextract-toggle");
    const tentativeToggle = document.getElementById("tentative-toggle");
    const multidayToggle = document.getElementById("multiday-toggle");
    const convertButton = document.getElementById("convert-button");
    const refreshModelsButton = document.getElementById("refresh-models");
    const sendButton = document.getElementById("send-button");
    const rejectButton = document.getElementById("reject-button");
    const backToFormButton = document.getElementById("backToFormButton");
    const cancelRequestButton = document.getElementById("cancelRequestButton");
    const closePopupButton = document.getElementById("close-popup");
    const openSettingsButton = document.getElementById("open-settings");
    const saveSettingsButton = document.getElementById("save-settings");
    const testConnectionButton = document.getElementById("test-connection");
    const openRouterKeyInput = document.getElementById("openRouterKey");
    const defaultModelSelect = document.getElementById("defaultModel");
    const fromEmailInput = document.getElementById("fromEmail");
    if (cancelRequestButton) {
      cancelRequestButton.style.display = "none";
    }
    function showStatus(message, type = "loading", isError = false) {
      statusDiv.textContent = message;
      statusDiv.className = `status-${type}`;
      statusDiv.style.display = "block";
      if (isError) {
        document.body.classList.add("error-state");
      } else {
        document.body.classList.remove("error-state");
      }
    }
    function hideStatus() {
      statusDiv.style.display = "none";
      statusDiv.textContent = "";
      document.body.classList.remove("error-state");
    }
    function showReviewStatus(message, type = "loading") {
      reviewStatusDiv.textContent = message;
      reviewStatusDiv.className = `status-${type}`;
      reviewStatusDiv.style.display = "block";
    }
    function hideReviewStatus() {
      reviewStatusDiv.style.display = "none";
      reviewStatusDiv.textContent = "";
    }
    function disableForm(disable = true) {
      instructionsInput.disabled = disable;
      convertButton.disabled = disable;
      modelSelect.disabled = disable;
      refreshModelsButton.disabled = disable;
      tentativeToggle.disabled = disable;
      if (preextractToggle2)
        preextractToggle2.disabled = disable;
      const reviewRadios = document.querySelectorAll('input[name="review-option"]');
      reviewRadios.forEach((radio) => radio.disabled = disable);
    }
    function disableReviewButtons(disable = true) {
      sendButton.disabled = disable;
      rejectButton.disabled = disable;
    }
    async function getActiveTab() {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        return tabs[0];
      } else {
        throw new Error("Could not get active tab.");
      }
    }
    async function captureVisibleTabScreenshot() {
      if (isInIframe) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "captureScreenshot" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Screenshot message error:", chrome.runtime.lastError.message);
              resolve(null);
              return;
            }
            if (response && response.success && response.screenshot) {
              const original = "data:image/jpeg;base64," + response.screenshot;
              compressImage(original, 0.5, 0.75).then((compressed) => {
                try {
                  const origBytes = Math.round(response.screenshot.length * 3 / 4);
                  const compBytes = Math.round((compressed.length - "data:image/jpeg;base64,".length) * 3 / 4);
                  console.log("\u{1F4C9} Screenshot compressed", { originalBytes: origBytes, compressedBytes: compBytes });
                } catch {
                }
                resolve(compressed);
              }).catch((err) => {
                console.warn("Compression failed, using original screenshot:", err);
                resolve(original);
              });
            } else {
              console.error("Screenshot request failed:", response?.error || "Unknown error");
              resolve(null);
            }
          });
        });
      }
      return null;
    }
    function compressImage(dataUrl, scale, quality) {
      return new Promise((resolve, reject) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const targetW = Math.max(1, Math.floor(img.width * scale));
              const targetH = Math.max(1, Math.floor(img.height * scale));
              const canvas = document.createElement("canvas");
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Canvas 2D context not available"));
                return;
              }
              ctx.drawImage(img, 0, 0, targetW, targetH);
              const out = canvas.toDataURL("image/jpeg", quality);
              resolve(out);
            } catch (e) {
              reject(e);
            }
          };
          img.onerror = (e) => reject(new Error("Image load failed"));
          img.src = dataUrl;
        } catch (err) {
          reject(err);
        }
      });
    }
    async function fetchAvailableModels() {
      try {
        const response = await chrome.runtime.sendMessage({ action: "listModels" });
        if (!response.success) {
          console.warn("Failed to fetch models from background:", response.error);
          return getOfflineAllowedModels();
        }
        const allModels = response.data || [];
        const filteredModels = filterAllowedModels(allModels);
        console.log("Available models:", filteredModels);
        return filteredModels;
      } catch (error) {
        console.error("Error fetching models:", error);
        return getOfflineAllowedModels();
      }
    }
    function getOfflineAllowedModels() {
      return [
        { id: "openai/gpt-5", name: "GPT-5" },
        { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
        { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
        { id: "openai/o3", name: "OpenAI o3" },
        { id: "anthropic/claude-opus-4.1", name: "Claude Opus 4.1" },
        { id: "openai/o4-mini-high", name: "OpenAI o4 Mini High" }
      ];
    }
    function filterAllowedModels(allModels) {
      const allowedModelIds = [
        "openai/gpt-5",
        "openai/gpt-5-nano",
        "google/gemini-2.5-pro",
        "anthropic/claude-sonnet-4",
        "openai/o3",
        "anthropic/claude-opus-4.1",
        "openai/o4-mini-high"
      ];
      const filteredModels = allModels.filter(
        (model) => allowedModelIds.includes(model.id)
      );
      const foundIds = filteredModels.map((m) => m.id);
      const missingIds = allowedModelIds.filter((id) => !foundIds.includes(id));
      missingIds.forEach((id) => {
        const fallbackModel = getOfflineAllowedModels().find((m) => m.id === id);
        if (fallbackModel) {
          filteredModels.push(fallbackModel);
        }
      });
      return filteredModels.sort((a, b) => {
        const aIndex = allowedModelIds.indexOf(a.id);
        const bIndex = allowedModelIds.indexOf(b.id);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    }
    async function loadModels(forceRefresh = false) {
      if (!forceRefresh && availableModels.length > 0) {
        console.log("Using cached models.");
        populateModelDropdown();
        return;
      }
      console.log("Loading AI models...");
      showStatus("Loading AI models...");
      modelSelect.disabled = true;
      refreshModelsButton.disabled = true;
      try {
        const models = await fetchAvailableModels();
        console.log("Received models:", models);
        const settings = await chrome.storage.sync.get(["defaultModel"]);
        const savedModel = settings.defaultModel || "openai/gpt-5";
        availableModels = models.map((model) => ({
          id: model.id,
          name: model.name || model.id,
          default: model.id === savedModel
        }));
        selectedModel = availableModels.find((m) => m.default)?.id || (availableModels.length > 0 ? availableModels[0].id : null);
        console.log("Default model ID:", selectedModel);
        populateModelDropdown();
        hideStatus();
      } catch (error) {
        console.error("Error loading models:", error);
        showStatus("Error loading models", "error", true);
      } finally {
        modelSelect.disabled = false;
        refreshModelsButton.disabled = false;
      }
    }
    function populateModelDropdown() {
      if (!modelSelect || availableModels.length === 0)
        return;
      modelSelect.innerHTML = "";
      availableModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        if (model.default || model.id === selectedModel) {
          option.selected = true;
        }
        modelSelect.appendChild(option);
      });
    }
    function areRequiredSettingsPresent(settings) {
      return Boolean(settings.openRouterKey && settings.postmarkApiKey && settings.fromEmail && settings.toTentativeEmail && settings.toConfirmedEmail);
    }
    async function loadSettingsIntoUI() {
      const settings = await chrome.storage.sync.get([
        "openRouterKey",
        "postmarkApiKey",
        "fromEmail",
        "toTentativeEmail",
        "toConfirmedEmail",
        "defaultModel"
      ]);
      openRouterKeyInput.value = settings.openRouterKey || "";
      const postmarkApiKeyInput = document.getElementById("postmarkApiKey");
      postmarkApiKeyInput.value = settings.postmarkApiKey || "";
      fromEmailInput.value = settings.fromEmail || "";
      const toTentativeEmailInput = document.getElementById("toTentativeEmail");
      toTentativeEmailInput.value = settings.toTentativeEmail || "";
      const toConfirmedEmailInput = document.getElementById("toConfirmedEmail");
      toConfirmedEmailInput.value = settings.toConfirmedEmail || "";
      await populateDefaultModels(settings.defaultModel);
    }
    async function populateDefaultModels(selectedModel2) {
      try {
        const models = await fetchAvailableModels();
        defaultModelSelect.innerHTML = "";
        if (models.length === 0) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "No models available";
          defaultModelSelect.appendChild(option);
          return;
        }
        models.forEach((model) => {
          const option = document.createElement("option");
          option.value = model.id;
          option.textContent = model.name;
          if (selectedModel2 && selectedModel2 === model.id) {
            option.selected = true;
          }
          defaultModelSelect.appendChild(option);
        });
        if (!selectedModel2 && models.length > 0) {
          const defaultModel = models.find((m) => m.id === "openai/gpt-5") || models[0];
          defaultModel && (defaultModelSelect.value = defaultModel.id);
        }
      } catch (error) {
        console.error("Error loading models for settings:", error);
        defaultModelSelect.innerHTML = '<option value="">Error loading models</option>';
      }
    }
    async function showSettings() {
      await loadSettingsIntoUI();
      settingsSection.style.display = "block";
      formSection.style.display = "none";
      reviewSection.style.display = "none";
      processingView.style.display = "none";
    }
    async function showForm() {
      settingsSection.style.display = "none";
      formSection.style.display = "block";
      reviewSection.style.display = "none";
      processingView.style.display = "none";
      await loadModels();
    }
    async function initializeExtension() {
      const settings = await chrome.storage.sync.get([
        "openRouterKey",
        "postmarkApiKey",
        "fromEmail",
        "toTentativeEmail",
        "toConfirmedEmail",
        "defaultModel"
      ]);
      if (!areRequiredSettingsPresent(settings)) {
        await showSettings();
      } else {
        await showForm();
      }
    }
    async function generateICS() {
      console.log("\u{1F680} Generate ICS Started");
      const instructions = instructionsInput.value.trim();
      const model = modelSelect.value;
      const tentative = tentativeToggle.checked;
      const multiday = multidayToggle.checked;
      const preextract = preextractToggle2?.checked ?? true;
      const reviewFirst = document.querySelector('input[name="review-option"]:checked')?.value === "review";
      console.log("\u{1F4CB} Form values:", {
        instructions,
        model,
        tentative,
        multiday,
        reviewFirst
      });
      if (!model) {
        console.error("\u274C No model selected");
        showStatus("Please select an AI model", "error", true);
        return;
      }
      try {
        formSection.style.display = "none";
        processingView.style.display = "block";
        const requestData = document.getElementById("requestData");
        const statusMessage = document.getElementById("statusMessage");
        console.log("\u{1F4C4} Getting page content...");
        statusMessage.textContent = "Getting page content...";
        const tab = await getActiveTab();
        console.log("\u{1F50D} Active tab:", { id: tab.id, url: tab.url });
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => ({
            url: window.location.href,
            html: document.documentElement.outerHTML,
            text: document.body.innerText
          })
        });
        const pageContent = results[0].result;
        console.log("\u{1F4C4} Page content extracted:", {
          url: pageContent.url,
          htmlLength: pageContent.html.length,
          textLength: pageContent.text.length
        });
        requestData.textContent = JSON.stringify({
          url: pageContent.url,
          instructions: instructions || "None",
          model,
          tentative,
          multiday,
          reviewFirst
        }, null, 2);
        console.log("\u{1F4F8} Capturing screenshot...");
        statusMessage.textContent = "Capturing screenshot...";
        const screenshot = await captureVisibleTabScreenshot();
        console.log("\u{1F4F8} Screenshot captured:", { hasScreenshot: !!screenshot, length: screenshot?.length || 0 });
        console.log("\u{1F916} Calling AI model...");
        statusMessage.textContent = "Analyzing content with AI...";
        let effectiveHtml = pageContent.html;
        if (preextract) {
          console.log("\u{1F9FC} Pre-extracting main content with gpt-5-nano...");
          statusMessage.textContent = "Finding main content...";
          try {
            const extracted = await extractMainContent(pageContent.url, pageContent.html);
            if (extracted && extracted.length > 100) {
              effectiveHtml = extracted;
              console.log("\u2705 Main content extracted:", { length: effectiveHtml.length });
            } else {
              console.warn("\u26A0\uFE0F Extraction returned too little content; using full HTML");
            }
          } catch (exErr) {
            console.warn("\u26A0\uFE0F Extraction failed; using full HTML", exErr);
          }
        }
        let events;
        try {
          events = await callAIModel({ ...pageContent, html: effectiveHtml }, instructions, model, tentative, multiday, screenshot);
        } catch (err) {
          if (preextract) {
            console.warn("\u26A0\uFE0F Parsing failed with extracted content. Retrying with full HTML...");
            events = await callAIModel(pageContent, instructions, model, tentative, multiday, screenshot);
          } else {
            throw err;
          }
        }
        console.log("\u{1F3AF} AI model returned events:", { eventCount: events.length, events });
        console.log("\u{1F4C5} Generating ICS file...");
        statusMessage.textContent = "Generating ICS file...";
        const icsContent = await generateICSContent(events, tentative);
        console.log("\u{1F4C5} ICS content generated:", { length: icsContent.length, preview: icsContent.substring(0, 200) + "..." });
        if (reviewFirst) {
          await showReviewSection(events, icsContent);
        } else {
          try {
            statusMessage.textContent = "Sending email...";
            await sendEmail(events, icsContent, tentative);
            statusMessage.textContent = "Email sent. ICS ready to download.";
          } catch (sendErr) {
            console.error("\u{1F4A5} Auto-send failed:", sendErr);
            statusMessage.textContent = `Email failed: ${sendErr?.message || sendErr}`;
          }
          const responseAccordion = document.getElementById("responseAccordion");
          const responseData = document.getElementById("responseData");
          const eventSummary = events.length === 1 ? `${events[0].summary}` : `${events.length} Events`;
          const eventDetails = events.length === 1 ? `${events[0].start_date}${events[0].start_time ? " at " + events[0].start_time : " (All day)"}` : `${events[0].start_date} - ${events[events.length - 1].end_date || events[events.length - 1].start_date}`;
          responseAccordion.classList.remove("d-none");
          responseData.innerHTML = `
                    <div class="alert alert-success">
                        <h4>\u2705 ${events.length === 1 ? "Event" : "Events"} Created & Email Sent</h4>
                        <h5>${eventSummary}</h5>
                        <p>${eventDetails}</p>
                        <div class="mt-3">
                            <button id="download-ics-btn" class="btn btn-primary me-2">\u{1F4BE} Download ICS</button>
                        </div>
                    </div>
                `;
          const downloadBtn = document.getElementById("download-ics-btn");
          if (downloadBtn) {
            downloadBtn.addEventListener("click", () => {
              window.downloadICS("${encodeURIComponent(icsContent)}", "${events[0].summary}");
            });
          }
          const closeButton = document.getElementById("closeButton");
          closeButton.style.display = "block";
        }
      } catch (error) {
        console.error("\u{1F4A5} Error generating ICS:", error);
        console.error("\u{1F4A5} Error stack:", error.stack);
        showStatus(`Error: ${error.message}`, "error", true);
        processingView.style.display = "none";
        formSection.style.display = "block";
      }
      console.log("\u{1F3C1} Generate ICS process completed");
    }
    async function callAIModel(pageData, instructions, model, tentative, multiday, screenshot) {
      console.log("\u{1F916} AI Request Starting...", {
        model,
        url: pageData.url,
        htmlLength: pageData.html?.length || 0,
        hasScreenshot: !!screenshot,
        instructions: instructions.substring(0, 100) + "...",
        tentative,
        multiday
      });
      const cleanUrl = stripTrackingParameters(pageData.url);
      const systemPrompt = `You are an AI assistant that extracts event information from web content and converts it to structured JSON for calendar creation.

Extract event details from the provided content. Pay attention to:
- Use ISO 8601 date format (YYYY-MM-DD) and 24-hour time format (HH:MM)
- For all-day events, set start_time and end_time to null
- If no end time specified, make reasonable estimate
- Default timezone is America/New_York unless specified
- Multi-day events: ${multiday ? "Focus on the PRIMARY event mentioned on the page. Only if there is no clear primary event, extract multiple events" : "Extract exactly one event"}
- Event status: ${tentative ? "Tentative" : "Confirmed"} (set status field only; do NOT include a "Status:" line in the description)
- Concerts: Include the complete program as listed on the page in the description under a section titled "Program:". Preserve the order, include composer names and full work titles (and movements if listed).
- Location selection: If both streaming and in-person options are present, ALWAYS use the in-person option. Set the location to the physical venue name AND address (street, city, state) if available. You may include a URL as the location only if no physical venue/address is available anywhere on the page; otherwise, never use a URL for the location. You may mention streaming details in the description, but the location must prefer the physical address.
- CRITICAL: Always include the source URL in the "url" field
- CRITICAL: Always add the source URL at the end of the description with format: "\\n\\nSource: [URL]"
- Important: Do NOT fetch or browse the Source URL or any external resources. Only use the provided HTML under "Content to analyze" and the optional screenshot image. The Source URL is for attribution/reference only.`;
      const userText = `${instructions ? `Special instructions: ${instructions}
` : ""}
Source URL (MUST be included in url field and description): ${cleanUrl}

Content to analyze:
${pageData.html}`;
      const eventSchema = {
        type: "object",
        properties: {
          events: {
            type: "array",
            description: multiday ? "Array of calendar events (focus on primary event, multiple only if no clear primary)" : "Array of calendar events (must contain exactly one event)",
            minItems: 1,
            maxItems: multiday ? 50 : 1,
            items: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "Event title"
                },
                location: {
                  type: "string",
                  description: "Physical venue name and address (preferred). If no physical venue/address is available, use a URL. If both streaming and in-person exist, choose the in-person venue address."
                },
                start_date: {
                  type: "string",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                  description: "Start date in YYYY-MM-DD format"
                },
                start_time: {
                  type: ["string", "null"],
                  pattern: "^\\d{2}:\\d{2}$",
                  description: "Start time in HH:MM format or null for all-day"
                },
                end_date: {
                  type: "string",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                  description: "End date in YYYY-MM-DD format"
                },
                end_time: {
                  type: ["string", "null"],
                  pattern: "^\\d{2}:\\d{2}$",
                  description: "End time in HH:MM format or null for all-day"
                },
                description: {
                  type: "string",
                  description: "Event description"
                },
                timezone: {
                  type: "string",
                  default: "America/New_York",
                  description: "Timezone for the event"
                },
                url: {
                  type: "string",
                  description: "Event URL or source URL"
                }
              },
              required: ["summary", "location", "start_date", "end_date", "start_time", "end_time", "description", "timezone", "url"],
              additionalProperties: false
            }
          }
        },
        required: ["events"],
        additionalProperties: false
      };
      const userContent = [
        { type: "text", text: userText }
      ];
      if (screenshot) {
        userContent.push({ type: "image_url", image_url: { url: screenshot } });
      }
      const payload = {
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userContent
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "calendar_event",
            schema: eventSchema,
            strict: true
          }
        },
        max_tokens: 2e4,
        temperature: 0.1
      };
      console.log("\u{1F4E4} OpenRouter request payload (popup):", payload);
      const response = await chrome.runtime.sendMessage({
        action: "callOpenRouter",
        payload
      });
      console.log("\u{1F4E5} Background script response:", {
        success: response.success,
        hasData: !!response.data,
        error: response.error,
        choices: response.data?.choices?.length || 0
      });
      if (!response.success) {
        console.error("\u274C AI Request Failed:", response.error);
        throw new Error(`OpenRouter API error: ${response.error}`);
      }
      const aiResponse = response.data.choices[0]?.message?.content || "";
      console.log("\u2705 AI Request Completed:", {
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 200) + "..."
      });
      return parseAiResponse(aiResponse);
    }
    async function extractMainContent(url, html) {
      const system = "You extract the MAIN CONTENT region from raw HTML of a web page. Return only the main article/body content as plain text, removing navigation, ads, footers, and unrelated sections.";
      const user = `URL: ${url}

HTML:
${html}`;
      const payload = {
        model: "openai/gpt-5-nano",
        messages: [
          { role: "system", content: system },
          { role: "user", content: [{ type: "text", text: user }] }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "main_content",
            schema: {
              type: "object",
              properties: { content: { type: "string" } },
              required: ["content"],
              additionalProperties: false
            },
            strict: true
          }
        },
        max_tokens: 8e3,
        temperature: 0
      };
      console.log("\u{1F50E} Pre-extract request payload:", payload);
      const response = await chrome.runtime.sendMessage({ action: "callOpenRouter", payload });
      if (!response.success) {
        throw new Error(`Pre-extract failed: ${response.error}`);
      }
      const content = (() => {
        const txt = response.data?.choices?.[0]?.message?.content || "";
        try {
          return JSON.parse(txt)?.content || "";
        } catch {
          return txt;
        }
      })();
      return content;
    }
    function parseAiResponse(response) {
      try {
        let cleaned = response.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.replace(/```json\n?/, "").replace(/\n?```$/, "");
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/```\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(cleaned);
        if (!parsed.events || !Array.isArray(parsed.events)) {
          throw new Error("Response must contain an events array");
        }
        if (parsed.events.length === 0) {
          throw new Error("Events array cannot be empty");
        }
        for (const event of parsed.events) {
          if (!event.summary) {
            throw new Error("Missing required field: summary");
          }
          if (!event.start_date) {
            throw new Error("Missing required field: start_date");
          }
        }
        return parsed.events;
      } catch (error) {
        console.error("Error parsing AI response:", error);
        throw new Error(`Failed to parse AI response: ${error.message}`);
      }
    }
    async function generateICSContent(events, tentative) {
      const sanitizeDescription = (text) => {
        if (!text)
          return "";
        return text.replace(/(^|\n)\s*Status:\s*(Tentative|Confirmed)\s*(?=\n|$)/gi, "$1").trim();
      };
      const eventDataArray = events.map((eventData) => ({
        summary: eventData.summary,
        description: sanitizeDescription(eventData.description || ""),
        location: eventData.location || "",
        dtstart: eventData.start_date + (eventData.start_time ? `T${eventData.start_time}:00` : "T00:00:00"),
        dtend: eventData.end_date ? eventData.end_date + (eventData.end_time ? `T${eventData.end_time}:00` : "T23:59:59") : void 0,
        timezone: eventData.timezone || "America/New_York",
        isAllDay: eventData.start_time === null,
        status: tentative ? "tentative" : "confirmed",
        url: eventData.url
      }));
      const settings = await chrome.storage.sync.get(["fromEmail"]);
      return icsGenerator.generateIcs(eventDataArray, {}, settings.fromEmail);
    }
    async function showReviewSection(events, icsContent) {
      processingView.style.display = "none";
      reviewSection.style.display = "block";
      reviewData = { eventData: events, icsContent };
      const reviewContent = document.getElementById("review-content");
      const reviewRecipient = document.getElementById("review-recipient");
      const reviewSubject = document.getElementById("review-subject");
      function escapeHtml(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      }
      function linkifyAndBreaks(text) {
        const escaped = escapeHtml(text || "");
        const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        return linked.replace(/\n/g, "<br>");
      }
      function parseIcsDescriptions(ics) {
        try {
          const jcal = ICALmodule.parse(ics);
          const comp = new ICALmodule.Component(jcal);
          const vevents = comp.getAllSubcomponents("vevent") || [];
          const blocks = vevents.map((ve, idx) => {
            const ev = new ICALmodule.Event(ve);
            const desc = (ev.description || "").toString();
            const summary = (ev.summary || `Event ${idx + 1}`).toString();
            const dtstart = ev.startDate?.toJSDate?.();
            const dtend = ev.endDate?.toJSDate?.();
            const loc = ev.location ? ev.location.toString() : void 0;
            const fmt = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
            const dateStr = dtstart ? `${fmt(dtstart)}${dtend ? ` \u2013 ${fmt(dtend)}` : ""}` : "";
            return {
              title: summary,
              descriptionHtml: linkifyAndBreaks(desc),
              date: dateStr,
              location: loc
            };
          });
          const subject = vevents.length === 1 ? new ICALmodule.Event(vevents[0]).summary?.toString() || "Calendar Event" : `Calendar Events: ${vevents.length} Events`;
          return { subject, blocks };
        } catch (e) {
          const subject = events.length === 1 ? `Calendar Event: ${events[0].summary}` : `Calendar Events: ${events.length} Events`;
          const blocks = events.map((eventData, idx) => ({
            title: eventData.summary || `Event ${idx + 1}`,
            descriptionHtml: linkifyAndBreaks(eventData.description || ""),
            date: `${eventData.start_date}${eventData.start_time ? " " + eventData.start_time : ""}`,
            location: eventData.location
          }));
          return { subject, blocks };
        }
      }
      const settings = await chrome.storage.sync.get(["toTentativeEmail", "toConfirmedEmail"]);
      const recipientEmail = tentativeToggle.checked ? settings.toTentativeEmail || "tentative@example.com" : settings.toConfirmedEmail || "confirmed@example.com";
      reviewRecipient.textContent = recipientEmail;
      const parsed = parseIcsDescriptions(icsContent);
      reviewSubject.textContent = parsed.subject;
      reviewContent.innerHTML = parsed.blocks.map((b, idx) => `
            <div class="ics-details mb-3">
                <h6>${parsed.blocks.length > 1 ? `Event ${idx + 1}: ` : ""}${escapeHtml(b.title)}</h6>
                ${b.date ? `<p><strong>Date:</strong> ${escapeHtml(b.date)}</p>` : ""}
                ${b.location ? `<p><strong>Location:</strong> ${escapeHtml(b.location)}</p>` : ""}
                <div><strong>Description:</strong><br>${b.descriptionHtml || "<em>(none)</em>"}</div>
            </div>
        `).join("");
    }
    function stripTrackingParameters(url) {
      if (!url)
        return url;
      try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const trackingParams = [
          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_term",
          "utm_content",
          "utm_id",
          "utm_source_platform",
          "utm_creative_format",
          "utm_marketing_tactic",
          "fbclid",
          "gclid",
          "dclid",
          "msclkid",
          "mc_cid",
          "mc_eid",
          "_ga",
          "_gid",
          "_gac",
          "ref",
          "referer",
          "referrer"
        ];
        let hasChanges = false;
        for (const param of trackingParams) {
          if (params.has(param)) {
            params.delete(param);
            hasChanges = true;
          }
        }
        if (hasChanges) {
          urlObj.search = params.toString();
          return urlObj.toString();
        }
        return url;
      } catch (error) {
        return url;
      }
    }
    convertButton?.addEventListener("click", generateICS);
    refreshModelsButton?.addEventListener("click", () => loadModels(true));
    backToFormButton?.addEventListener("click", () => {
      processingView.style.display = "none";
      reviewSection.style.display = "none";
      formSection.style.display = "block";
    });
    sendButton?.addEventListener("click", async () => {
      if (reviewData) {
        console.log("\u{1F4E7} Send button clicked, sending email...");
        showReviewStatus("Sending email...", "loading");
        disableReviewButtons(true);
        try {
          await sendEmail(reviewData.eventData, reviewData.icsContent, tentativeToggle.checked);
          console.log("\u2705 Email sent successfully from review section");
          hideReviewStatus();
          reviewSection.style.display = "none";
          formSection.style.display = "block";
          showStatus("Email sent successfully!", "success");
        } catch (error) {
          console.error("\u{1F4A5} Error sending email from review section:", error);
          showReviewStatus(`Failed to send email: ${error.message}`, "error");
        } finally {
          disableReviewButtons(false);
        }
      }
    });
    rejectButton?.addEventListener("click", () => {
      reviewData = null;
      reviewSection.style.display = "none";
      formSection.style.display = "block";
    });
    closePopupButton?.addEventListener("click", () => {
      if (isInIframe) {
        window.parent.postMessage({ type: "CLOSE_IFRAME" }, "*");
      } else {
        window.close();
      }
    });
    openSettingsButton?.addEventListener("click", () => {
      showSettings();
    });
    saveSettingsButton?.addEventListener("click", async () => {
      const openRouterKey = openRouterKeyInput.value.trim();
      const postmarkApiKeyInput = document.getElementById("postmarkApiKey");
      const postmarkApiKey = postmarkApiKeyInput.value.trim();
      const fromEmail = fromEmailInput.value.trim();
      const toTentativeEmailInput = document.getElementById("toTentativeEmail");
      const toTentativeEmail = toTentativeEmailInput.value.trim();
      const toConfirmedEmailInput = document.getElementById("toConfirmedEmail");
      const toConfirmedEmail = toConfirmedEmailInput.value.trim();
      const defaultModel = defaultModelSelect.value;
      if (!openRouterKey) {
        showStatus("OpenRouter API key is required", "error", true);
        return;
      }
      if (!postmarkApiKey) {
        showStatus("Postmark API key is required", "error", true);
        return;
      }
      if (!fromEmail) {
        showStatus("From email is required", "error", true);
        return;
      }
      if (!toTentativeEmail) {
        showStatus("Tentative email recipient is required", "error", true);
        return;
      }
      if (!toConfirmedEmail) {
        showStatus("Confirmed email recipient is required", "error", true);
        return;
      }
      await chrome.storage.sync.set({
        openRouterKey,
        postmarkApiKey,
        fromEmail,
        toTentativeEmail,
        toConfirmedEmail,
        defaultModel
      });
      showStatus("Settings saved successfully!", "success");
      if (areRequiredSettingsPresent({ openRouterKey, postmarkApiKey, fromEmail, toTentativeEmail, toConfirmedEmail })) {
        setTimeout(showForm, 1e3);
      }
    });
    testConnectionButton?.addEventListener("click", async () => {
      const openRouterKey = openRouterKeyInput.value.trim();
      const postmarkApiKeyInput = document.getElementById("postmarkApiKey");
      const postmarkKey = postmarkApiKeyInput.value.trim();
      if (!openRouterKey) {
        alert("Please enter an OpenRouter API key first");
        return;
      }
      testConnectionButton.disabled = true;
      testConnectionButton.textContent = "Testing...";
      try {
        const openRouterResponse = await chrome.runtime.sendMessage({ action: "listModels" });
        if (!openRouterResponse.success) {
          throw new Error(`OpenRouter API test failed: ${openRouterResponse.error}`);
        }
        const modelCount = openRouterResponse.data?.length || 0;
        if (!postmarkKey) {
          alert(`\u2705 OpenRouter API test passed! Found ${modelCount} models.

Postmark API Key not provided - email sending will not work.`);
          await populateDefaultModels(defaultModelSelect.value);
          return;
        }
        try {
          const response = await fetch("https://api.postmarkapp.com/server", {
            headers: {
              "X-Postmark-Server-Token": postmarkKey,
              "Content-Type": "application/json"
            }
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          alert(`\u2705 Both APIs tested successfully! Found ${modelCount} models.`);
          await populateDefaultModels(defaultModelSelect.value);
        } catch (postmarkError) {
          throw new Error(`Postmark API test failed: ${postmarkError.message}`);
        }
      } catch (error) {
        console.error("Connection test failed:", error);
        alert(`\u274C Connection test failed: ${error.message}`);
      } finally {
        testConnectionButton.disabled = false;
        testConnectionButton.textContent = "Test Connection";
      }
    });
    if (isInIframe) {
      window.addEventListener("message", (event) => {
        if (event.data.type === "INIT_FROM_CONTENT") {
          if (instructionsInput && event.data.data.selectedText) {
            instructionsInput.value = `Focus on this section exclusively. Use surrounding HTML for context, but this is the event we want:

${event.data.data.selectedText}`;
          }
        }
      });
    }
    window.downloadICS = (content, filename) => {
      const decoded = decodeURIComponent(content);
      const blob = new Blob([decoded], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    };
    async function sendEmail(events, icsContent, tentative) {
      console.log("\u{1F4EC} sendEmail function called:", {
        eventCount: events.length,
        icsLength: icsContent.length,
        tentative
      });
      try {
        console.log("\u2699\uFE0F Loading email settings...");
        const settings = await chrome.storage.sync.get([
          "fromEmail",
          "toTentativeEmail",
          "toConfirmedEmail"
        ]);
        console.log("\u2699\uFE0F Email settings loaded:", {
          hasFromEmail: !!settings.fromEmail,
          hasToTentative: !!settings.toTentativeEmail,
          hasToConfirmed: !!settings.toConfirmedEmail,
          tentative
        });
        const recipientEmail = tentative ? settings.toTentativeEmail : settings.toConfirmedEmail;
        const isMultiple = Array.isArray(events) && events.length > 1;
        console.log("\u{1F4E7} Email details:", {
          recipientEmail,
          fromEmail: settings.fromEmail,
          isMultiple,
          tentative
        });
        let subject;
        let emailBody;
        const sanitizeDescription = (text) => {
          if (!text)
            return "";
          return text.replace(/(^|\n)\s*Status:\s*(Tentative|Confirmed)\s*(?=\n|$)/gi, "$1").trim();
        };
        if (isMultiple) {
          subject = `Calendar Events: ${events.length} Events`;
          const eventsList = events.map((event, index) => {
            const desc = sanitizeDescription(event.description || "");
            return `${index + 1}. ${event.summary} - ${event.start_date}${event.start_time ? " at " + event.start_time : ""}${desc ? `
   ${desc}` : ""}`;
          }).join("\n");
          emailBody = `Please find the attached calendar events.

${eventsList}`;
        } else {
          const event = events[0];
          subject = `Calendar Event: ${event.summary}`;
          const cleanDesc = sanitizeDescription(event.description || "");
          emailBody = `Please find the calendar invitation attached.

Event: ${event.summary}
${event.location ? `Location: ${event.location}
` : ""}${cleanDesc ? `Description: ${cleanDesc}` : ""}`;
        }
        const emailPayload = {
          From: settings.fromEmail,
          To: recipientEmail,
          Subject: subject,
          TextBody: emailBody,
          Attachments: [
            {
              Name: "invite.ics",
              Content: btoa(unescape(encodeURIComponent(icsContent))),
              ContentType: "text/calendar"
            }
          ]
        };
        console.log("\u{1F4E4} Sending email payload to background script:", {
          from: emailPayload.From,
          to: emailPayload.To,
          subject: emailPayload.Subject,
          bodyLength: emailPayload.TextBody.length,
          attachmentSize: emailPayload.Attachments[0].Content.length
        });
        const response = await chrome.runtime.sendMessage({
          action: "sendEmail",
          payload: emailPayload
        });
        console.log("\u{1F4E5} Email send response:", response);
        if (response.success) {
          console.log("\u2705 Email sent successfully:", response.data);
          return { message: "Calendar invite sent successfully!" };
        } else {
          console.error("\u274C Email send failed:", response.error);
          throw new Error(response.error);
        }
      } catch (error) {
        console.error("\u{1F4A5} Email sending error:", error);
        throw error;
      }
    }
    window.sendEmail = async (eventData, icsContent) => {
      console.log("\u{1F310} Global sendEmail called from HTML onclick");
      try {
        const events = JSON.parse(decodeURIComponent(eventData));
        console.log("\u{1F4E7} Calling internal sendEmail function:", { eventCount: events.length });
        await sendEmail(events, icsContent, tentativeToggle.checked);
        console.log("\u2705 Global sendEmail completed successfully");
        showStatus("Email sent successfully!", "success");
      } catch (error) {
        console.error("\u{1F4A5} Global sendEmail error:", error);
        showStatus(`Failed to send email: ${error.message}`, "error", true);
      }
    };
    await initializeExtension();
  });
})();
/*! Bundled license information:

bootstrap/dist/js/bootstrap.esm.js:
  (*!
    * Bootstrap v5.3.7 (https://getbootstrap.com/)
    * Copyright 2011-2025 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
    * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
    *)
*/
//# sourceMappingURL=popup.bundle.js.map
