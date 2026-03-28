#!/usr/bin/env node
import fs2 from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path2 from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import fs5 from 'fs/promises';
import { isTTY, spinner, note, outro, intro, text, isCancel, select, confirm } from '@clack/prompts';
import { parseArgs } from 'util';
import { spawn } from 'child_process';

/* tailwind-styled-v4 v5.0.1 | MIT | https://github.com/dictionar32/tailwind-styled-v4 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  __defProp(target, "default", { value: mod, enumerable: true }) ,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/cli/node_modules/commander/lib/error.js
var require_error = __commonJS({
  "packages/cli/node_modules/commander/lib/error.js"(exports$1) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports$1.CommanderError = CommanderError2;
    exports$1.InvalidArgumentError = InvalidArgumentError2;
  }
});

// packages/cli/node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "packages/cli/node_modules/commander/lib/argument.js"(exports$1) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports$1.Argument = Argument2;
    exports$1.humanReadableArgName = humanReadableArgName;
  }
});

// packages/cli/node_modules/commander/lib/help.js
var require_help = __commonJS({
  "packages/cli/node_modules/commander/lib/help.js"(exports$1) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(
              fullText,
              helpWidth - itemIndentWidth,
              termWidth + itemSeparatorWidth
            );
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.wrap(commandDescription, helpWidth, 0),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(
            helper.argumentTerm(argument),
            helper.argumentDescription(argument)
          );
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option)
          );
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(
              helper.optionTerm(option),
              helper.optionDescription(option)
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              "Global Options:",
              formatList(globalOptionList),
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(
            helper.subcommandTerm(cmd2),
            helper.subcommandDescription(cmd2)
          );
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str.match(manualIndent)) return str;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str;
        const leadingStr = str.slice(0, indent);
        const columnText = str.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(
          `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
          "g"
        );
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i) => {
          if (line === "\n") return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports$1.Help = Help2;
  }
});

// packages/cli/node_modules/commander/lib/option.js
var require_option = __commonJS({
  "packages/cli/node_modules/commander/lib/option.js"(exports$1) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
        shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports$1.Option = Option2;
    exports$1.DualOptions = DualOptions;
  }
});

// packages/cli/node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "packages/cli/node_modules/commander/lib/suggestSimilar.js"(exports$1) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports$1.suggestSimilar = suggestSimilar;
  }
});

// packages/cli/node_modules/commander/lib/command.js
var require_command = __commonJS({
  "packages/cli/node_modules/commander/lib/command.js"(exports$1) {
    var EventEmitter = __require("events").EventEmitter;
    var childProcess = __require("child_process");
    var path25 = __require("path");
    var fs8 = __require("fs");
    var process2 = __require("process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          outputError: (str, write) => write(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path25.resolve(baseDir, baseName);
          if (fs8.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path25.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs8.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs8.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path25.resolve(
            path25.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path25.basename(
              this._scriptPath,
              path25.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path25.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path25.basename(filename, path25.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path26) {
        if (path26 === void 0) return this._executableDir;
        this._executableDir = path26;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", context)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process2.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text2) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text2 === "function") {
            helpStr = text2({ error: context.error, command: context.command });
          } else {
            helpStr = text2;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports$1.Command = Command2;
  }
});

// packages/cli/node_modules/commander/index.js
var require_commander = __commonJS({
  "packages/cli/node_modules/commander/index.js"(exports$1) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports$1.program = new Command2();
    exports$1.createCommand = (name) => new Command2(name);
    exports$1.createOption = (flags, description) => new Option2(flags, description);
    exports$1.createArgument = (name, description) => new Argument2(name, description);
    exports$1.Command = Command2;
    exports$1.Option = Option2;
    exports$1.Argument = Argument2;
    exports$1.Help = Help2;
    exports$1.CommanderError = CommanderError2;
    exports$1.InvalidArgumentError = InvalidArgumentError2;
    exports$1.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// packages/cli/node_modules/commander/esm.mjs
var import_index, program, createCommand, createArgument, createOption, CommanderError, InvalidArgumentError, InvalidOptionArgumentError, Command, Argument, Option, Help;
var init_esm = __esm({
  "packages/cli/node_modules/commander/esm.mjs"() {
    import_index = __toESM(require_commander());
    ({
      program,
      createCommand,
      createArgument,
      createOption,
      CommanderError,
      InvalidArgumentError,
      InvalidOptionArgumentError,
      Command: (
        // deprecated old name
        Command
      ),
      Argument,
      Option,
      Help
    } = import_index.default);
  }
});

// packages/cli/src/utils/errors.ts
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function errorToJson(error, debug = false, command) {
  const payload = {
    ok: false,
    error: true,
    message: errorMessage(error),
    code: error instanceof CliError ? error.code : "CLI_ERROR",
    exitCode: error instanceof CliError ? error.exitCode : 1,
    command: command ?? null,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (debug && error instanceof Error && error.stack) {
    payload.stack = error.stack;
  }
  return JSON.stringify(payload, null, 2);
}
function errorExitCode(error) {
  return error instanceof CliError ? error.exitCode : 1;
}
var CliError, CliUsageError;
var init_errors = __esm({
  "packages/cli/src/utils/errors.ts"() {
    CliError = class extends Error {
      constructor(message, options = {}) {
        super(message, options.cause ? { cause: options.cause } : void 0);
        this.name = "CliError";
        this.exitCode = options.exitCode ?? 1;
        this.code = options.code ?? "CLI_ERROR";
      }
    };
    CliUsageError = class extends CliError {
      constructor(message, options = {}) {
        super(message, { ...options, exitCode: 2, code: "CLI_USAGE_ERROR" });
        this.name = "CliUsageError";
      }
    };
  }
});
function getPlatformExtension() {
  const platform = os.platform();
  switch (platform) {
    case "win32":
      return ".node";
    case "darwin":
      return ".dylib";
    case "linux":
      return ".so";
    default:
      return ".node";
  }
}
function formatErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function resolveRuntimeDir(dirnameValue, moduleImportUrl) {
  if (typeof dirnameValue === "string" && dirnameValue.length > 0) return dirnameValue;
  return path2.dirname(fileURLToPath(moduleImportUrl));
}
function resolveNativeBindingCandidates(options) {
  const out = [];
  const envVarNames = options.envVarNames ?? ["TWS_NATIVE_PATH"];
  for (const envVarName of envVarNames) {
    const raw = process.env[envVarName]?.trim();
    if (!raw) continue;
    const resolved = path2.resolve(raw);
    if (options.enforceNodeExtensionForEnvPath) {
      if (path2.extname(resolved).toLowerCase() !== ".node") {
        throw new Error(
          `Invalid native binding path from ${envVarName}="${raw}". Expected a .node file.`
        );
      }
    }
    out.push(resolved);
  }
  if (options.includeDefaultCandidates !== false) {
    const ext = options.platformExtension ?? getPlatformExtension();
    const defaultBindingName = `tailwind_styled_parser${ext}`;
    out.push(path2.resolve(process.cwd(), "native", defaultBindingName));
    out.push(path2.resolve(options.runtimeDir, "..", "..", "..", "native", defaultBindingName));
  }
  return Array.from(new Set(out));
}
function parseDebugToken(namespace, token) {
  if (token === "*" || token === namespace || token === "tailwind-styled:*") return true;
  return token.endsWith("*") && namespace.startsWith(token.slice(0, -1));
}
function isDebugNamespaceEnabled(namespace) {
  if (process.env.TWS_DEBUG === "1" || process.env.TAILWIND_STYLED_DEBUG === "1") return true;
  const raw = process.env.DEBUG;
  if (!raw) return false;
  return raw.split(",").map((token) => token.trim()).some((token) => parseDebugToken(namespace, token));
}
function createDebugLogger(namespace, label = namespace) {
  const debugEnabled = isDebugNamespaceEnabled(namespace);
  return (message) => {
    if (!debugEnabled) return;
    console.debug(`[${label}] ${message}`);
  };
}
function loadNativeBinding(options) {
  const req = createRequire(path2.join(options.runtimeDir, "noop.cjs"));
  const loadErrors = [];
  for (const candidate of options.candidates) {
    if (!fs2.existsSync(candidate)) continue;
    try {
      const mod = req(candidate);
      if (options.isValid(mod)) {
        return {
          binding: mod,
          loadedPath: candidate,
          loadErrors
        };
      }
      loadErrors.push({
        path: candidate,
        message: options.invalidExportMessage
      });
    } catch (error) {
      loadErrors.push({
        path: candidate,
        message: formatErrorMessage(error)
      });
    }
  }
  return {
    binding: null,
    loadedPath: null,
    loadErrors
  };
}
var init_nativeBinding = __esm({
  "packages/shared/src/nativeBinding.ts"() {
  }
});

// packages/shared/src/logger.ts
function getEnvLevel() {
  const env = process.env.TWS_LOG_LEVEL?.toLowerCase();
  if (env && env in LEVELS) return env;
  return process.env.TWS_DEBUG_SCANNER === "1" ? "debug" : "info";
}
function createLogger(prefix, level) {
  let currentLevel = getEnvLevel();
  const log3 = (msgLevel, stream, args) => {
    if (LEVELS[msgLevel] > LEVELS[currentLevel]) return;
    const line = `[${prefix}] ${args.map(String).join(" ")}
`;
    process[stream].write(line);
  };
  return {
    error: (...a) => log3("error", "stderr", a),
    warn: (...a) => log3("warn", "stderr", a),
    info: (...a) => log3("info", "stdout", a),
    debug: (...a) => log3("debug", "stderr", a),
    setLevel: (l) => {
      currentLevel = l;
    }
  };
}
var LEVELS;
var init_logger = __esm({
  "packages/shared/src/logger.ts"() {
    LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
    createLogger("tailwind-styled");
  }
});

// packages/shared/src/index.ts
var init_src = __esm({
  "packages/shared/src/index.ts"() {
    init_nativeBinding();
    init_logger();
  }
});

// packages/compiler/src/nativeBridge.ts
var nativeBridge_exports = {};
__export(nativeBridge_exports, {
  adaptNativeResult: () => adaptNativeResult,
  getNativeBridge: () => getNativeBridge,
  resetNativeBridgeCache: () => resetNativeBridgeCache
});
function tryRequire(id) {
  try {
    const mod = requireFromRuntime(id);
    return mod ?? null;
  } catch (error) {
    log.debug(
      `native bridge load miss ${id}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
function getNativeBridge() {
  if (cachedBridge !== void 0) {
    if (cachedBridge === null) {
      throw new Error(
        `[tailwind-styled/compiler v5] Native binding is required but not available.
Please ensure:
  1. The native module is properly installed
  2. You have run: npm run build:native (or use prebuilt binary)
  3. TWS_NO_NATIVE environment variable is not set

For help, see: https://tailwind-styled.dev/docs/install`
      );
    }
    return cachedBridge;
  }
  if (process.env.TWS_NO_NATIVE === "1" || process.env.TWS_NO_RUST === "1") {
    cachedBridge = null;
    throw new Error(
      `[tailwind-styled/compiler v5] Native binding is required.
The TWS_NO_NATIVE or TWS_NO_RUST environment variable is set, which disables native binding.
Please unset this environment variable to use the native compiler.`
    );
  }
  const candidates = [
    "@tailwind-styled/native",
    path2.resolve(process.cwd(), "native", "index.mjs"),
    path2.resolve(runtimeDir, "..", "..", "native", "index.mjs"),
    path2.resolve(runtimeDir, "..", "..", "..", "native", "index.mjs"),
    path2.resolve(process.cwd(), "native", "index.node"),
    path2.resolve(runtimeDir, "..", "..", "native", "index.node"),
    path2.resolve(runtimeDir, "..", "..", "..", "native", "index.node")
  ];
  for (const candidate of candidates) {
    const bridge = tryRequire(candidate);
    if (bridge) {
      log.debug(`native bridge loaded from ${candidate}`);
      cachedBridge = bridge;
      return cachedBridge;
    }
  }
  cachedBridge = null;
  throw new Error(
    `[tailwind-styled/compiler v5] Native binding not found.
Tried loading from:
` + candidates.map((c) => `  - ${c}`).join("\n") + `

Please build the native module:
  npm run build:native

Or install a prebuilt binary for your platform.`
  );
}
function resetNativeBridgeCache() {
  cachedBridge = void 0;
}
function adaptNativeResult(raw) {
  let rsc;
  if (raw.rscJson) {
    try {
      const parsed = JSON.parse(raw.rscJson);
      rsc = {
        isServer: parsed.isServer,
        needsClientDirective: parsed.needsClientDirective,
        clientReasons: []
      };
    } catch {
    }
  }
  let metadata;
  if (raw.metadataJson) {
    try {
      metadata = JSON.parse(raw.metadataJson);
    } catch {
    }
  }
  return {
    code: raw.code,
    classes: raw.classes,
    changed: raw.changed,
    rsc,
    metadata
  };
}
var getDirname, runtimeDir, requireFromRuntime, cachedBridge, log;
var init_nativeBridge = __esm({
  "packages/compiler/src/nativeBridge.ts"() {
    init_src();
    getDirname = () => {
      if (typeof __dirname !== "undefined") {
        return __dirname;
      }
      if (typeof import.meta !== "undefined" && import.meta.url) {
        return path2.dirname(fileURLToPath(import.meta.url));
      }
      return process.cwd();
    };
    runtimeDir = getDirname();
    requireFromRuntime = typeof module !== "undefined" && typeof module.require === "function" ? module.require.bind(module) : createRequire(path2.join(runtimeDir, "noop.cjs"));
    log = createLogger("compiler:native");
  }
});

// packages/compiler/src/twDetector.ts
var TEMPLATE_RE, OBJECT_RE, EXTEND_RE;
var init_twDetector = __esm({
  "packages/compiler/src/twDetector.ts"() {
    TEMPLATE_RE = /\btw\.(server\.)?(\w+)`((?:[^`\\]|\\.)*)`/g;
    OBJECT_RE = /\btw\.(server\.)?(\w+)\(\s*(\{[\s\S]*?\})\s*\)/g;
    EXTEND_RE = /(\w+)\.extend`((?:[^`\\]|\\.)*)`/g;
  }
});
function getBinding() {
  if (_binding !== void 0) {
    if (_binding === null) {
      throw new Error(
        `[tailwind-styled/compiler v5] Native CSS binding is required but not available.
Please ensure the native module is properly built.`
      );
    }
    return _binding;
  }
  if (process.env.TWS_NO_NATIVE === "1") {
    _binding = null;
    throw new Error(
      `[tailwind-styled/compiler v5] Native binding is required.
The TWS_NO_NATIVE environment variable is set, which disables native binding.`
    );
  }
  const req = typeof __require === "function" ? __require : createRequire(import.meta.url);
  const currentDir = getDirname2();
  const candidates = [
    path2.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
    path2.resolve(currentDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node")
  ];
  for (const c of candidates) {
    try {
      const mod = req(c);
      if (mod?.compileCss) {
        _binding = mod;
        return _binding;
      }
    } catch {
    }
  }
  _binding = null;
  throw new Error(
    `[tailwind-styled/compiler v5] Native CSS binding not found.
Tried loading from:
` + candidates.map((c) => `  - ${c}`).join("\n") + `

Please build the native module.`
  );
}
function compileCssFromClasses(classes, options = {}) {
  const binding = getBinding();
  const prefix = options.prefix ?? null;
  const r = binding.compileCss(classes, prefix);
  return {
    css: r.css,
    resolvedClasses: r.resolvedClasses,
    unknownClasses: r.unknownClasses,
    sizeBytes: r.sizeBytes,
    engine: "rust"
  };
}
var getDirname2, _binding;
var init_cssCompiler = __esm({
  "packages/compiler/src/cssCompiler.ts"() {
    getDirname2 = () => {
      if (typeof __dirname !== "undefined") {
        return __dirname;
      }
      if (typeof import.meta !== "undefined" && import.meta.url) {
        return path2.dirname(fileURLToPath(import.meta.url));
      }
      return process.cwd();
    };
  }
});

// packages/compiler/src/classExtractor.ts
function extractAllClasses(source) {
  const { getNativeBridge: getNativeBridge2 } = (init_nativeBridge(), __toCommonJS(nativeBridge_exports));
  const native = getNativeBridge2();
  if (!native?.extractClassesFromSourceNative) {
    throw new Error(
      `[tailwind-styled/compiler v5] extractClassesFromSourceNative is required but not available.
Please ensure the native module is properly built.`
    );
  }
  const result = native.extractClassesFromSourceNative(source);
  if (!result || result.length < 0) {
    throw new Error(
      `[tailwind-styled/compiler v5] extractClassesFromSourceNative returned invalid result.`
    );
  }
  return result.sort();
}
var init_classExtractor = __esm({
  "packages/compiler/src/classExtractor.ts"() {
    init_twDetector();
    new RegExp(TEMPLATE_RE.source, "g");
    new RegExp(OBJECT_RE.source, "g");
    new RegExp(EXTEND_RE.source, "g");
  }
});

// packages/compiler/src/index.ts
var init_src2 = __esm({
  "packages/compiler/src/index.ts"() {
    init_cssCompiler();
    init_classExtractor();
  }
});

// packages/scanner/src/native-bridge.ts
var native_bridge_exports = {};
__export(native_bridge_exports, {
  cachePriorityNative: () => cachePriorityNative,
  cacheReadNative: () => cacheReadNative,
  cacheWriteNative: () => cacheWriteNative,
  extractClassesNative: () => extractClassesNative,
  hasNativeScannerBinding: () => hasNativeScannerBinding,
  hashContentNative: () => hashContentNative,
  isRustCacheAvailable: () => isRustCacheAvailable,
  scanWorkspaceNative: () => scanWorkspaceNative
});
function getDirname3() {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path2.dirname(fileURLToPath(import.meta.url));
  }
  return process.cwd();
}
function getBinding2() {
  if (_binding2 !== void 0) {
    if (_binding2 === null) {
      throwNativeBindingError();
    }
    return _binding2;
  }
  if (process.env.TWS_NO_NATIVE === "1" || process.env.TWS_NO_RUST === "1") {
    _loadError = "Native loading is disabled by TWS_NO_NATIVE or TWS_NO_RUST environment variable.";
    _binding2 = null;
    _candidatePaths = [];
    throwNativeBindingError();
  }
  const runtimeDir2 = getDirname3();
  _candidatePaths = [
    path2.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
    path2.resolve(runtimeDir2, "..", "..", "..", "native", "tailwind_styled_parser.node")
  ];
  const req = typeof __require === "function" ? __require : createRequire(path2.join(runtimeDir2, "noop.cjs"));
  for (const c of _candidatePaths) {
    try {
      const mod = req(c);
      if (mod?.scanWorkspace || mod?.extractClassesFromSource || mod?.hashFileContent || mod?.cacheRead || mod?.cacheWrite) {
        _binding2 = mod;
        return _binding2;
      }
    } catch (error) {
      _loadError = error instanceof Error ? error.message : String(error);
    }
  }
  _binding2 = null;
  throwNativeBindingError();
}
function throwNativeBindingError() {
  const lines = [
    "FATAL: Native scanner binding not found.",
    "",
    "This package requires the Rust native binding 'tailwind_styled_parser.node'.",
    "The binding was not found in any of these paths:",
    ..._candidatePaths.map((p) => `  - ${p}`),
    ""
  ];
  if (_loadError) {
    lines.push("Load error:", `  ${_loadError}`, "");
  }
  lines.push(
    "To fix this, run:",
    "  npm run build:rust",
    "",
    "This will build the native Rust module from the 'native/' directory.",
    "If you're using this package in a CI/CD environment, ensure Rust toolchain is installed",
    "and 'npm run build:rust' is executed before running tests or building."
  );
  throw new Error(lines.join("\n"));
}
function scanWorkspaceNative(root, extensions) {
  return getBinding2().scanWorkspace(root, extensions ?? null);
}
function extractClassesNative(source) {
  const result = getBinding2().extractClassesFromSource?.(source);
  if (result === null || result === void 0) {
    throw new Error("Native extractClassesFromSource returned null/undefined");
  }
  return result;
}
function hashContentNative(content) {
  const result = getBinding2().hashFileContent?.(content);
  if (result === null || result === void 0) {
    throw new Error("Native hashFileContent returned null/undefined");
  }
  return result;
}
function isRustCacheAvailable() {
  return true;
}
function hasNativeScannerBinding() {
  try {
    getBinding2();
    return true;
  } catch {
    return false;
  }
}
function cacheReadNative(cachePath) {
  const result = getBinding2().cacheRead?.(cachePath);
  if (result === null || result === void 0) {
    throw new Error("Native cacheRead returned null/undefined");
  }
  return result;
}
function cacheWriteNative(cachePath, entries) {
  const result = getBinding2().cacheWrite?.(cachePath, entries);
  if (result === null || result === void 0) {
    throw new Error("Native cacheWrite returned null/undefined");
  }
  return result;
}
function cachePriorityNative(mtimeMs, size, cachedMtimeMs, cachedSize, cachedHitCount, cachedLastSeenMs, nowMs = Date.now()) {
  const result = getBinding2().cachePriority?.(
    mtimeMs,
    size,
    cachedMtimeMs,
    cachedSize,
    cachedHitCount,
    cachedLastSeenMs,
    nowMs
  );
  if (result === null || result === void 0) {
    throw new Error("Native cachePriority returned null/undefined");
  }
  return result;
}
var _binding2, _loadError, _candidatePaths;
var init_native_bridge = __esm({
  "packages/scanner/src/native-bridge.ts"() {
    _binding2 = void 0;
    _loadError = null;
    _candidatePaths = [];
  }
});
function defaultCachePath(rootDir, cacheDir) {
  const dir = cacheDir ? path2.resolve(rootDir, cacheDir) : path2.join(process.cwd(), ".cache", "tailwind-styled");
  return path2.join(dir, "scanner-cache.json");
}
function readCache(rootDir, cacheDir) {
  const cachePath = defaultCachePath(rootDir, cacheDir);
  const result = cacheReadNative(cachePath);
  if (!result) return [];
  return result.entries.map((e) => ({
    file: e.file,
    classes: e.classes,
    hash: e.hash,
    mtimeMs: e.mtimeMs,
    size: e.size,
    hitCount: e.hitCount
  }));
}
function writeCache(rootDir, entries, cacheDir) {
  const cachePath = defaultCachePath(rootDir, cacheDir);
  const success = cacheWriteNative(cachePath, entries);
  if (!success) {
    throw new Error(
      "Native cacheWrite failed. Run 'npm run build:rust' to rebuild native bindings."
    );
  }
}
function filePriority(mtimeMs, size, cached, nowMs = Date.now()) {
  return cachePriorityNative(
    mtimeMs,
    size,
    cached?.mtimeMs ?? 0,
    cached?.size ?? 0,
    cached?.hitCount ?? 0,
    cached?.lastSeenMs ?? 0,
    nowMs
  );
}
var init_cache_native = __esm({
  "packages/scanner/src/cache-native.ts"() {
    init_native_bridge();
  }
});
function canUseCjsRequire() {
  return typeof __require === "function";
}
function debugNative(message) {
  log2.debug(`[native] ${message}`);
}
function loadNativeParserBinding() {
  if (nativeParserBinding !== void 0) return nativeParserBinding;
  if (!canUseCjsRequire()) {
    nativeParserBinding = null;
    nativeParserInitError = "require is unavailable in current module format";
    debugNative(`fallback to JS: ${nativeParserInitError}`);
    return nativeParserBinding;
  }
  const candidates = [
    path2.resolve(process.cwd(), "native/tailwind_styled_parser.node"),
    path2.resolve(process.cwd(), "native/build/Release/tailwind_styled_parser.node")
  ];
  for (const fullPath of candidates) {
    if (!fs2.existsSync(fullPath)) continue;
    try {
      const required = __require(fullPath);
      if (required && typeof required.parse_classes === "function") {
        nativeParserBinding = required;
        debugNative(`using native parser from ${fullPath}`);
        return nativeParserBinding;
      }
    } catch (error) {
      nativeParserInitError = error instanceof Error ? error.message : String(error);
    }
  }
  nativeParserBinding = null;
  if (!nativeParserInitError) {
    nativeParserInitError = "native .node binding not found";
  }
  debugNative(`fallback to JS: ${nativeParserInitError}`);
  return nativeParserBinding;
}
function normalizeWithNativeParser(tokens) {
  const binding = loadNativeParserBinding();
  if (!binding || typeof binding.parse_classes !== "function") {
    throw new Error(
      "Native parser binding is required but not available. Run 'npm run build:rust' to build it."
    );
  }
  try {
    const parsed = binding.parse_classes(tokens.join(" "));
    const normalized = parsed.map((item) => item.raw?.trim() ?? "").filter(Boolean);
    return Array.from(new Set(normalized));
  } catch (error) {
    const errorMessage2 = error instanceof Error ? error.message : String(error);
    throw new Error(`Native parser failed: ${errorMessage2}. Run 'npm run build:rust' to rebuild.`);
  }
}
function resolveScannerWorkerModulePath() {
  const runtimeDir2 = (() => {
    if (typeof __dirname !== "undefined" && __dirname.length > 0) {
      return __dirname;
    }
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return path2.dirname(fileURLToPath(import.meta.url));
    }
    return process.cwd();
  })();
  const candidates = [
    path2.resolve(runtimeDir2, "index.cjs"),
    path2.resolve(runtimeDir2, "index.js"),
    path2.resolve(runtimeDir2, "index.ts")
  ];
  for (const candidate of candidates) {
    if (fs2.existsSync(candidate)) return candidate;
  }
  return null;
}
function scanWorkspaceInWorker(rootDir, options) {
  const modulePath = resolveScannerWorkerModulePath();
  if (!modulePath) {
    return Promise.reject(new Error("scanner worker module path could not be resolved"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(SCAN_WORKER_BOOTSTRAP, {
      eval: true,
      workerData: { modulePath, rootDir, options }
    });
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      reject(new Error(`scanner worker timed out after ${SCAN_WORKER_TIMEOUT_MS}ms`));
    }, SCAN_WORKER_TIMEOUT_MS);
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    worker.once("message", (payload) => {
      const message = payload;
      finish(() => {
        if (message?.ok) {
          resolve(message.result);
          return;
        }
        reject(new Error(message?.error ?? "scanner worker failed without an error message"));
      });
    });
    worker.once("error", (error) => {
      finish(() => reject(error));
    });
    worker.once("exit", (code) => {
      if (code !== 0) {
        finish(() => reject(new Error(`scanner worker exited with code ${code}`)));
      }
    });
  });
}
function buildExtensionSet(includeExtensions) {
  return new Set(includeExtensions);
}
function collectCandidates(rootDir, ignoreDirectories, extensionSet) {
  const candidates = [];
  const directories = [rootDir];
  while (directories.length > 0) {
    const currentDir = directories.pop();
    if (!currentDir) continue;
    let entries = [];
    try {
      entries = fs2.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path2.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirectories.has(entry.name)) directories.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!extensionSet.has(path2.extname(entry.name))) continue;
      candidates.push(fullPath);
    }
  }
  return candidates;
}
function toCacheSize(size) {
  if (!Number.isFinite(size)) return 0;
  const normalized = Math.max(0, Math.trunc(size));
  return Math.min(normalized, 4294967295);
}
function extractClassesJs(source) {
  return extractAllClasses(source);
}
function scanSource(source) {
  const nativeBinding = loadNativeParserBinding();
  if (nativeBinding && typeof nativeBinding.parse_classes === "function") {
    try {
      const baseClasses = extractClassesJs(source);
      const nativeNormalized = normalizeWithNativeParser(baseClasses);
      return nativeNormalized;
    } catch (error) {
      throw error;
    }
  }
  throw new Error(
    "Native parser binding is required but not available. Run 'npm run build:rust' to build it."
  );
}
function scanFile(filePath) {
  const source = fs2.readFileSync(filePath, "utf8");
  const hash = hashContentNative(source) ?? void 0;
  return {
    file: filePath,
    classes: scanSource(source),
    ...hash ? { hash } : {}
  };
}
function scanWorkspace(rootDir, options = {}) {
  const includeExtensions = options.includeExtensions ?? DEFAULT_EXTENSIONS;
  const extensionSet = buildExtensionSet(includeExtensions);
  const ignoreDirectories = new Set(options.ignoreDirectories ?? DEFAULT_IGNORES);
  const useCache = options.useCache ?? true;
  options.smartInvalidation ?? true;
  const files = [];
  const unique = /* @__PURE__ */ new Set();
  const candidates = collectCandidates(rootDir, ignoreDirectories, extensionSet);
  const processResult = (result) => {
    files.push(result);
    for (const cls of result.classes) unique.add(cls);
  };
  const { scanWorkspaceNative: scanWorkspaceNative2 } = (init_native_bridge(), __toCommonJS(native_bridge_exports));
  if (!options.cacheDir && !useCache) {
    const nativeResult = scanWorkspaceNative2(rootDir, includeExtensions);
    if (nativeResult) {
      return {
        files: nativeResult.files.map((f) => ({
          file: f.file,
          classes: f.classes
        })),
        totalFiles: nativeResult.totalFiles,
        uniqueClasses: nativeResult.uniqueClasses
      };
    }
  }
  if (useCache && isRustCacheAvailable()) {
    let cacheEntries = [];
    try {
      cacheEntries = readCache(rootDir, options.cacheDir);
    } catch (error) {
      cacheEntries = [];
      log2.debug(
        `cache read failed, continuing without persisted cache: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const cacheMap = new Map(cacheEntries.map((entry) => [entry.file, entry]));
    const nowMs = Date.now();
    const ranked = [];
    for (const filePath of candidates) {
      let stat;
      try {
        stat = fs2.statSync(filePath);
      } catch {
        continue;
      }
      const size = toCacheSize(stat.size);
      const cached = cacheMap.get(filePath);
      const priority = filePriority(
        stat.mtimeMs,
        size,
        cached ? {
          mtimeMs: cached.mtimeMs,
          size: cached.size,
          hitCount: cached.hitCount,
          lastSeenMs: 0
        } : void 0,
        nowMs
      );
      ranked.push({ filePath, stat, size, cached, priority });
    }
    ranked.sort((a, b) => b.priority - a.priority);
    const updatedEntries = [];
    for (const { filePath, stat, size, cached } of ranked) {
      let content;
      try {
        content = fs2.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }
      const hash = hashContentNative(content);
      if (cached && cached.hash === hash && cached.mtimeMs === stat.mtimeMs && cached.size === size) {
        log2.debug(`cache HIT ${filePath}`);
        processResult({ file: filePath, classes: cached.classes });
        updatedEntries.push({
          file: filePath,
          classes: cached.classes,
          hash: cached.hash,
          mtimeMs: stat.mtimeMs,
          size,
          hitCount: (cached.hitCount ?? 0) + 1
        });
        continue;
      }
      log2.debug(`cache MISS ${filePath}`);
      const classes = scanSource(content);
      processResult({ file: filePath, classes });
      updatedEntries.push({
        file: filePath,
        classes,
        hash,
        mtimeMs: stat.mtimeMs,
        size,
        hitCount: 1
      });
    }
    try {
      writeCache(rootDir, updatedEntries, options.cacheDir);
    } catch (error) {
      log2.debug(`cache write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      files,
      totalFiles: files.length,
      uniqueClasses: Array.from(unique).sort()
    };
  }
  for (const filePath of candidates) {
    processResult(scanFile(filePath));
  }
  return {
    files,
    totalFiles: files.length,
    uniqueClasses: Array.from(unique).sort()
  };
}
async function scanWorkspaceAsync(rootDir, options = {}) {
  if (process.env.TWS_DISABLE_SCANNER_WORKER === "1") {
    return scanWorkspace(rootDir, options);
  }
  try {
    return await scanWorkspaceInWorker(rootDir, options);
  } catch (error) {
    log2.debug(
      `worker scan failed, falling back to sync scanner: ${error instanceof Error ? error.message : String(error)}`
    );
    return scanWorkspace(rootDir, options);
  }
}
var log2, SCAN_WORKER_TIMEOUT_MS, SCAN_WORKER_BOOTSTRAP, nativeParserBinding, nativeParserInitError, DEFAULT_EXTENSIONS, DEFAULT_IGNORES;
var init_src3 = __esm({
  "packages/scanner/src/index.ts"() {
    init_src2();
    init_src();
    init_cache_native();
    init_native_bridge();
    log2 = createLogger("scanner");
    SCAN_WORKER_TIMEOUT_MS = 12e4;
    SCAN_WORKER_BOOTSTRAP = `
const { parentPort, workerData } = require("node:worker_threads")
try {
  const scanner = require(workerData.modulePath)
  const result = scanner.scanWorkspace(workerData.rootDir, workerData.options ?? {})
  parentPort.postMessage({ ok: true, result })
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  })
}
`;
    nativeParserInitError = null;
    DEFAULT_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
    DEFAULT_IGNORES = ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"];
  }
});
function formatErrorMessage2(error) {
  return error instanceof Error ? error.message : String(error);
}
function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
async function pathExists(filePath) {
  try {
    await fs2.promises.access(filePath, fs2.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
function sanitizeTopLimit(value) {
  if (!Number.isFinite(value)) return DEFAULT_TOP_LIMIT;
  return Math.max(1, Math.trunc(value));
}
function sanitizeFrequentThreshold(value) {
  if (!Number.isFinite(value)) return DEFAULT_FREQUENT_THRESHOLD;
  return Math.max(1, Math.trunc(value));
}
var DEFAULT_TOP_LIMIT, DEFAULT_FREQUENT_THRESHOLD, DEBUG_NAMESPACE, debugLog;
var init_utils = __esm({
  "packages/analyzer/src/utils.ts"() {
    init_src();
    DEFAULT_TOP_LIMIT = 10;
    DEFAULT_FREQUENT_THRESHOLD = 2;
    DEBUG_NAMESPACE = "tailwind-styled:analyzer";
    debugLog = createDebugLogger(DEBUG_NAMESPACE, "tailwind-styled/analyzer");
  }
});

// packages/analyzer/src/binding.ts
function isAnalyzerModule(module2) {
  const candidate = module2;
  return typeof candidate?.analyzeClasses === "function";
}
function getNativeBinding() {
  if (bindingCache !== void 0) return bindingCache;
  if (process.env.TWS_NO_NATIVE === "1" || process.env.TWS_NO_RUST === "1") {
    bindingCandidateCache = [];
    bindingLoadErrorsCache = [];
    loadedBindingPathCache = null;
    debugLog("native binding disabled by TWS_NO_NATIVE/TWS_NO_RUST");
    bindingCache = null;
    return bindingCache;
  }
  const runtimeDir2 = resolveRuntimeDir(
    typeof __dirname === "string" ? __dirname : void 0,
    import.meta.url
  );
  const candidates = resolveNativeBindingCandidates({
    runtimeDir: runtimeDir2,
    envVarNames: ["TWS_NATIVE_PATH"]
  });
  const { binding, loadErrors, loadedPath } = loadNativeBinding({
    runtimeDir: runtimeDir2,
    candidates,
    isValid: isAnalyzerModule,
    invalidExportMessage: "Module loaded but missing `analyzeClasses` export."
  });
  bindingCandidateCache = candidates;
  bindingLoadErrorsCache = loadErrors;
  loadedBindingPathCache = loadedPath;
  if (binding) {
    debugLog(`native binding loaded from: ${loadedPath}`);
    bindingCache = binding;
    return bindingCache;
  }
  if (bindingLoadErrorsCache.length > 0) {
    debugLog(
      `native binding load failed for ${bindingLoadErrorsCache.length} candidate(s): ${bindingLoadErrorsCache.map((entry) => `${entry.path} (${entry.message})`).join("; ")}`
    );
  } else {
    debugLog("native binding not found in any candidate path");
  }
  bindingCache = null;
  return bindingCache;
}
function requireNativeBinding() {
  const binding = getNativeBinding();
  if (binding?.analyzeClasses) return binding;
  const lines = [
    "Native analyzer binding not found. Ensure `tailwind_styled_parser.node` is built."
  ];
  if (process.env.TWS_NO_NATIVE === "1" || process.env.TWS_NO_RUST === "1") {
    lines.push("Native loading is disabled by TWS_NO_NATIVE/TWS_NO_RUST.");
  } else {
    lines.push("Checked paths:");
    for (const candidate of bindingCandidateCache) lines.push(`- ${candidate}`);
    if (bindingLoadErrorsCache.length > 0) {
      lines.push("Load errors:");
      for (const failure of bindingLoadErrorsCache) {
        lines.push(`- ${failure.path}: ${failure.message}`);
      }
    }
  }
  throw new Error(lines.join("\n"));
}
function requireNativeCssCompiler() {
  const binding = requireNativeBinding();
  if (typeof binding.compileCss === "function") return binding;
  const loadedPathText = loadedBindingPathCache ? ` (${loadedBindingPathCache})` : "";
  throw new Error(`Native analyzer compileCss binding is missing in v5${loadedPathText}.`);
}
var bindingCache, bindingCandidateCache, bindingLoadErrorsCache, loadedBindingPathCache;
var init_binding = __esm({
  "packages/analyzer/src/binding.ts"() {
    init_src();
    init_utils();
    bindingCandidateCache = [];
    bindingLoadErrorsCache = [];
    loadedBindingPathCache = null;
  }
});
function splitVariantAndBase(className) {
  const parts = className.split(":");
  if (parts.length <= 1) return { variantKey: "", base: className };
  const base = parts.pop() ?? className;
  return { variantKey: parts.join(":"), base };
}
function isArbitraryUtility(baseClass) {
  return baseClass.includes("[") && baseClass.includes("]");
}
function resolveConflictGroup(base) {
  if (isArbitraryUtility(base)) return null;
  if (["block", "inline", "inline-block", "inline-flex", "flex", "grid", "hidden"].includes(base))
    return "display";
  if (base.startsWith("bg-")) return "bg";
  if (base.startsWith("text-")) return "text";
  if (base.startsWith("font-")) return "font";
  if (base.startsWith("rounded")) return "rounded";
  if (base.startsWith("shadow")) return "shadow";
  if (base.startsWith("border-")) return "border";
  if (base.startsWith("opacity-")) return "opacity";
  if (base.startsWith("w-") || base.startsWith("min-w-") || base.startsWith("max-w-"))
    return "width";
  if (base.startsWith("h-") || base.startsWith("min-h-") || base.startsWith("max-h-"))
    return "height";
  if (base.startsWith("p-") || base.startsWith("px-") || base.startsWith("py-")) return "padding";
  if (base.startsWith("m-") || base.startsWith("mx-") || base.startsWith("my-")) return "margin";
  return null;
}
function detectConflicts(usages) {
  const buckets = /* @__PURE__ */ new Map();
  for (const usage of usages) {
    const { variantKey, base } = splitVariantAndBase(usage.name);
    const group = resolveConflictGroup(base);
    if (!group) continue;
    const key = `${variantKey}::${group}`;
    const bucket = buckets.get(key) ?? {
      variantKey,
      group,
      classes: /* @__PURE__ */ new Set()
    };
    bucket.classes.add(usage.name);
    buckets.set(key, bucket);
  }
  const conflicts = [];
  const conflictedClassNames = /* @__PURE__ */ new Set();
  for (const bucket of buckets.values()) {
    if (bucket.classes.size <= 1) continue;
    const classes = Array.from(bucket.classes).sort();
    for (const className of classes) conflictedClassNames.add(className);
    const variantLabel = bucket.variantKey.length > 0 ? bucket.variantKey : "base";
    conflicts.push({
      className: bucket.group,
      variants: bucket.variantKey.length > 0 ? bucket.variantKey.split(":") : [],
      classes,
      message: `Multiple ${bucket.group} utilities detected for "${variantLabel}".`
    });
  }
  conflicts.sort((left, right) => {
    if (right.classes.length !== left.classes.length)
      return right.classes.length - left.classes.length;
    return left.className.localeCompare(right.className);
  });
  return { conflicts, conflictedClassNames };
}
function isSupportedTailwindConfigPath(configPath) {
  return SUPPORTED_TAILWIND_CONFIG_EXTENSIONS.has(path2.extname(configPath).toLowerCase());
}
async function resolveTailwindConfigPath(root, explicitPath) {
  if (explicitPath) {
    const resolved = path2.resolve(root, explicitPath);
    if (!await pathExists(resolved)) return null;
    return resolved;
  }
  const candidates = [
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs"
  ];
  for (const candidate of candidates) {
    const fullPath = path2.resolve(root, candidate);
    if (await pathExists(fullPath)) return fullPath;
  }
  return null;
}
function collectSafelistFromConfig(config) {
  const raw = config.safelist;
  if (!Array.isArray(raw)) return [];
  const out = /* @__PURE__ */ new Set();
  for (const entry of raw) {
    if (typeof entry === "string" && entry.length > 0) {
      out.add(entry);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const pattern = entry.pattern;
    if (typeof pattern === "string" && pattern.length > 0) {
      out.add(pattern);
    }
  }
  return Array.from(out);
}
function collectCustomUtilities(config) {
  const out = /* @__PURE__ */ new Set();
  const theme = config.theme;
  if (!theme || typeof theme !== "object") return out;
  const extend = theme.extend;
  if (!extend || typeof extend !== "object") return out;
  for (const [section, value] of Object.entries(extend)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const key of Object.keys(value)) {
      out.add(`${section}-${key}`);
      if (section === "colors") {
        out.add(`bg-${key}`);
        out.add(`text-${key}`);
        out.add(`border-${key}`);
      } else if (section === "spacing") {
        out.add(`p-${key}`);
        out.add(`m-${key}`);
        out.add(`gap-${key}`);
        out.add(`w-${key}`);
        out.add(`h-${key}`);
      } else if (section === "fontSize") {
        out.add(`text-${key}`);
      } else if (section === "borderRadius") {
        out.add(`rounded-${key}`);
      } else if (section === "boxShadow") {
        out.add(`shadow-${key}`);
      }
    }
  }
  return out;
}
async function collectSafelistFromSource(configPath) {
  const source = await fs2.promises.readFile(configPath, "utf8");
  const safelistBlock = source.match(/safelist\s*:\s*\[([\s\S]*?)\]/m)?.[1];
  if (!safelistBlock) return [];
  const out = /* @__PURE__ */ new Set();
  const tokenRegex = /["'`]([^"'`]+)["'`]/g;
  let token = tokenRegex.exec(safelistBlock);
  while (token) {
    const value = token[1].trim();
    if (value.length > 0) out.add(value);
    token = tokenRegex.exec(safelistBlock);
  }
  return Array.from(out);
}
async function loadTailwindConfig(root, semanticOption) {
  const startMs = Date.now();
  const configPath = await resolveTailwindConfigPath(root, semanticOption?.tailwindConfigPath);
  if (!configPath) return null;
  if (!isSupportedTailwindConfigPath(configPath)) {
    return {
      path: configPath,
      loaded: false,
      warning: `Unsupported Tailwind config extension at "${configPath}". Supported extensions: .ts, .js, .cjs, .mjs.`,
      safelist: /* @__PURE__ */ new Set(),
      customUtilities: /* @__PURE__ */ new Set()
    };
  }
  const configStat = await fs2.promises.stat(configPath).catch(() => null);
  if (configStat) {
    const cached = tailwindConfigCache.get(configPath);
    if (cached && cached.mtimeMs === configStat.mtimeMs && cached.size === configStat.size) {
      debugLog(
        `tailwind config cache hit: ${configPath} (${cached.config.safelist.size} safelist entries)`
      );
      return cached.config;
    }
  }
  let config = null;
  let warning;
  try {
    const cacheBustToken = Math.trunc(configStat?.mtimeMs ?? Date.now());
    const imported = await import(`${pathToFileURL(configPath).href}?tws_mtime=${cacheBustToken}`);
    const candidate = imported.default ?? imported;
    if (isRecord(candidate)) {
      config = candidate;
    } else if (typeof candidate === "function") {
      const evaluated = candidate();
      if (isRecord(evaluated)) {
        config = evaluated;
      } else {
        warning = "Tailwind config export function must return an object.";
      }
    } else {
      warning = "Tailwind config export must be an object or a function returning an object.";
    }
  } catch (error) {
    warning = formatErrorMessage2(error);
  }
  const safelist = /* @__PURE__ */ new Set();
  const customUtilities = /* @__PURE__ */ new Set();
  if (config) {
    for (const item of collectSafelistFromConfig(config)) safelist.add(item);
    for (const item of collectCustomUtilities(config)) customUtilities.add(item);
  }
  if (safelist.size === 0) {
    try {
      for (const item of await collectSafelistFromSource(configPath)) safelist.add(item);
    } catch (error) {
      debugLog(
        `failed to parse safelist from source at "${configPath}": ${formatErrorMessage2(error)}`
      );
    }
  }
  const loaded = {
    path: configPath,
    loaded: config !== null,
    warning,
    safelist,
    customUtilities
  };
  if (configStat) {
    tailwindConfigCache.set(configPath, {
      mtimeMs: configStat.mtimeMs,
      size: configStat.size,
      config: loaded
    });
  }
  debugLog(
    `tailwind config loaded from "${configPath}" in ${Date.now() - startMs}ms (loaded=${loaded.loaded}, safelist=${loaded.safelist.size}, custom=${loaded.customUtilities.size})`
  );
  return loaded;
}
function utilityPrefix(baseClass) {
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass;
  if (normalized.includes("[") && normalized.includes("]")) return "arbitrary";
  if (normalized.startsWith("min-w-")) return "min-w";
  if (normalized.startsWith("max-w-")) return "max-w";
  if (normalized.startsWith("min-h-")) return "min-h";
  if (normalized.startsWith("max-h-")) return "max-h";
  if (normalized.startsWith("space-x-")) return "space-x";
  if (normalized.startsWith("space-y-")) return "space-y";
  if (normalized.startsWith("inline-")) return "inline";
  if (normalized.startsWith("border-")) return "border";
  if (normalized.startsWith("text-")) return "text";
  if (normalized.startsWith("bg-")) return "bg";
  if (normalized.startsWith("rounded")) return "rounded";
  if (normalized.startsWith("shadow")) return "shadow";
  const hyphen = normalized.indexOf("-");
  if (hyphen < 0) return normalized;
  return normalized.slice(0, hyphen);
}
function isKnownTailwindClass(className, safelist, customUtilities) {
  if (safelist.has(className) || customUtilities.has(className)) return true;
  const { base } = splitVariantAndBase(className);
  if (customUtilities.has(base)) return true;
  const prefix = utilityPrefix(base);
  return KNOWN_UTILITY_PREFIXES.has(prefix);
}
async function buildSemanticReport(usages, root, semanticOption) {
  const loadedConfig = await loadTailwindConfig(root, semanticOption);
  const safelist = loadedConfig?.safelist ?? /* @__PURE__ */ new Set();
  const customUtilities = loadedConfig?.customUtilities ?? /* @__PURE__ */ new Set();
  const usageNames = new Set(usages.map((usage) => usage.name));
  const unusedClasses = Array.from(safelist).filter((className) => !usageNames.has(className)).sort().map((className) => ({ name: className, count: 0, isUnused: true }));
  const unknownClasses = usages.filter((usage) => !isKnownTailwindClass(usage.name, safelist, customUtilities)).map((usage) => ({ ...usage, isUnused: true }));
  const { conflicts } = detectConflicts(usages);
  return {
    unusedClasses,
    unknownClasses,
    conflicts,
    ...loadedConfig ? {
      tailwindConfig: {
        path: loadedConfig.path,
        loaded: loadedConfig.loaded,
        safelistCount: loadedConfig.safelist.size,
        customUtilityCount: loadedConfig.customUtilities.size,
        ...loadedConfig.warning ? { warning: loadedConfig.warning } : {}
      }
    } : {}
  };
}
var SUPPORTED_TAILWIND_CONFIG_EXTENSIONS, KNOWN_UTILITY_PREFIXES, tailwindConfigCache;
var init_semantic = __esm({
  "packages/analyzer/src/semantic.ts"() {
    init_utils();
    SUPPORTED_TAILWIND_CONFIG_EXTENSIONS = /* @__PURE__ */ new Set([".ts", ".js", ".cjs", ".mjs"]);
    KNOWN_UTILITY_PREFIXES = /* @__PURE__ */ new Set([
      "absolute",
      "align",
      "animate",
      "arbitrary",
      "aspect",
      "backdrop",
      "basis",
      "bg",
      "block",
      "border",
      "bottom",
      "col",
      "container",
      "contents",
      "cursor",
      "dark",
      "display",
      "divide",
      "fill",
      "fixed",
      "flex",
      "float",
      "font",
      "from",
      "gap",
      "grid",
      "grow",
      "h",
      "hidden",
      "inset",
      "inline",
      "isolate",
      "items",
      "justify",
      "left",
      "leading",
      "line",
      "list",
      "m",
      "max-h",
      "max-w",
      "mb",
      "min-h",
      "min-w",
      "ml",
      "mr",
      "mt",
      "mx",
      "my",
      "object",
      "opacity",
      "order",
      "origin",
      "outline",
      "overflow",
      "overscroll",
      "p",
      "pb",
      "pe",
      "perspective",
      "place",
      "pl",
      "pointer",
      "position",
      "pr",
      "ps",
      "pt",
      "px",
      "py",
      "relative",
      "right",
      "ring",
      "rotate",
      "rounded",
      "row",
      "scale",
      "shadow",
      "shrink",
      "size",
      "skew",
      "snap",
      "space-x",
      "space-y",
      "sr",
      "start",
      "static",
      "sticky",
      "stroke",
      "table",
      "text",
      "to",
      "top",
      "touch",
      "tracking",
      "transform",
      "transition",
      "translate",
      "truncate",
      "underline",
      "via",
      "visible",
      "w",
      "whitespace",
      "z"
    ]);
    tailwindConfigCache = /* @__PURE__ */ new Map();
  }
});
function normalizeScan(scan, includeClass) {
  if (!includeClass) return scan;
  const filteredFiles = scan.files.map((file) => ({
    file: file.file,
    classes: file.classes.filter((className) => includeClass(className))
  }));
  const unique = /* @__PURE__ */ new Set();
  for (const file of filteredFiles) {
    for (const className of file.classes) unique.add(className);
  }
  return {
    files: filteredFiles,
    totalFiles: scan.totalFiles,
    uniqueClasses: Array.from(unique).sort()
  };
}
function collectClassCounts(scan) {
  const counts = /* @__PURE__ */ new Map();
  for (const file of scan.files) {
    for (const className of file.classes) {
      counts.set(className, (counts.get(className) ?? 0) + 1);
    }
  }
  return counts;
}
function buildClassUsage(counts) {
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.name.localeCompare(right.name);
  });
}
function buildDistribution(usages) {
  const distribution = {
    "1": 0,
    "2-3": 0,
    "4-7": 0,
    "8+": 0
  };
  for (const usage of usages) {
    if (usage.count === 1) {
      distribution["1"] += 1;
      continue;
    }
    if (usage.count <= 3) {
      distribution["2-3"] += 1;
      continue;
    }
    if (usage.count <= 7) {
      distribution["4-7"] += 1;
      continue;
    }
    distribution["8+"] += 1;
  }
  return distribution;
}
async function analyzeWorkspace(root, options = {}) {
  const startedAtMs = Date.now();
  const resolvedRoot = path2.resolve(root);
  const scanStartedAtMs = Date.now();
  let scan;
  try {
    scan = await scanWorkspaceAsync(resolvedRoot, options.scanner);
  } catch (error) {
    throw new Error(`Failed to scan workspace at "${resolvedRoot}": ${formatErrorMessage2(error)}`, {
      cause: error
    });
  }
  debugLog(
    `scanWorkspaceAsync processed ${scan.totalFiles} files in ${Date.now() - scanStartedAtMs}ms`
  );
  const normalizedScan = normalizeScan(scan, options.includeClass);
  const topLimit = sanitizeTopLimit(options.classStats?.top);
  const frequentThreshold = sanitizeFrequentThreshold(options.classStats?.frequentThreshold);
  const binding = requireNativeBinding();
  const filesJson = JSON.stringify(
    normalizedScan.files.map((file) => ({ file: file.file, classes: file.classes }))
  );
  let nativeReport = null;
  try {
    nativeReport = binding.analyzeClasses(filesJson, resolvedRoot, topLimit);
  } catch (error) {
    throw new Error(`Native analyzer failed for "${resolvedRoot}": ${formatErrorMessage2(error)}`, {
      cause: error
    });
  }
  if (!nativeReport) {
    throw new Error(`Native analyzer returned no report for "${resolvedRoot}".`);
  }
  const counts = collectClassCounts(normalizedScan);
  let all = buildClassUsage(counts);
  let semanticReport;
  if (options.semantic) {
    const semanticOption = typeof options.semantic === "object" ? options.semantic : void 0;
    const semanticStartedAtMs = Date.now();
    try {
      semanticReport = await buildSemanticReport(all, resolvedRoot, semanticOption);
    } catch (error) {
      throw new Error(
        `Failed to build semantic report for "${resolvedRoot}": ${formatErrorMessage2(error)}`,
        { cause: error }
      );
    }
    debugLog(`semantic report built in ${Date.now() - semanticStartedAtMs}ms`);
    if (semanticReport.conflicts.length > 0) {
      const conflicted = new Set(semanticReport.conflicts.flatMap((conflict) => conflict.classes));
      all = all.map(
        (usage) => conflicted.has(usage.name) ? { ...usage, isConflict: true } : usage
      );
    }
  }
  const top = all.slice(0, topLimit);
  const frequent = all.filter((usage) => usage.count >= frequentThreshold).slice(0, topLimit);
  const unique = all.filter((usage) => usage.count === 1);
  const totalClassOccurrences = all.reduce((sum, usage) => sum + usage.count, 0);
  debugLog(
    `analyzeWorkspace completed in ${Date.now() - startedAtMs}ms (files=${normalizedScan.totalFiles}, uniqueClasses=${all.length})`
  );
  return {
    root: nativeReport.root || resolvedRoot,
    totalFiles: nativeReport.totalFiles,
    uniqueClassCount: all.length,
    totalClassOccurrences,
    classStats: {
      all,
      top,
      frequent,
      unique,
      distribution: buildDistribution(all)
    },
    safelist: all.map((usage) => usage.name),
    ...semanticReport ? { semantic: semanticReport } : {}
  };
}
var init_analyzeWorkspace = __esm({
  "packages/analyzer/src/analyzeWorkspace.ts"() {
    init_src3();
    init_binding();
    init_semantic();
    init_utils();
  }
});

// packages/analyzer/src/classToCss.ts
function normalizeClassInput(input) {
  if (typeof input === "string") {
    return input.split(/\s+/).map((item) => item.trim()).filter((item) => item.length > 0);
  }
  if (!Array.isArray(input)) {
    throw new TypeError("classToCss input must be a string or an array of strings.");
  }
  const out = [];
  for (const item of input) {
    if (typeof item !== "string") {
      throw new TypeError("classToCss input array must contain only strings.");
    }
    const value = item.trim();
    if (value.length > 0) out.push(value);
  }
  return out;
}
function normalizeClassToCssOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classToCss options must be an object.");
  }
  const strict = options.strict ?? false;
  if (typeof strict !== "boolean") {
    throw new TypeError("classToCss options.strict must be a boolean when provided.");
  }
  const prefix = options.prefix ?? null;
  if (prefix !== null && typeof prefix !== "string") {
    throw new TypeError("classToCss options.prefix must be a string or null when provided.");
  }
  return { prefix, strict };
}
function mergeDeclarationMap(target, css) {
  const ruleRegex = /\{([^}]*)\}/g;
  let ruleMatch = ruleRegex.exec(css);
  while (ruleMatch) {
    const body = ruleMatch[1];
    for (const raw of body.split(";")) {
      const declaration = raw.trim();
      if (declaration.length === 0) continue;
      const colonIndex = declaration.indexOf(":");
      if (colonIndex <= 0) continue;
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (property.length === 0 || value.length === 0) continue;
      if (target.has(property)) target.delete(property);
      target.set(property, value);
    }
    ruleMatch = ruleRegex.exec(css);
  }
}
function declarationMapToString(declarationMap) {
  return Array.from(declarationMap.entries()).map(([property, value]) => `${property}: ${value}`).join("; ");
}
async function classToCss(input, options = {}) {
  const inputClasses = normalizeClassInput(input);
  const normalizedOptions = normalizeClassToCssOptions(options);
  if (inputClasses.length === 0) {
    return {
      inputClasses: [],
      css: "",
      declarations: "",
      resolvedClasses: [],
      unknownClasses: [],
      sizeBytes: 0
    };
  }
  const binding = requireNativeCssCompiler();
  const prefix = normalizedOptions.prefix;
  const cssChunks = [];
  const resolvedClasses = [];
  const unknownClasses = [];
  let sizeBytes = 0;
  const declarationMap = /* @__PURE__ */ new Map();
  for (const className of inputClasses) {
    let compiled = null;
    try {
      compiled = binding.compileCss([className], prefix);
    } catch (error) {
      throw new Error(
        `Native analyzer failed while compiling class "${className}": ${formatErrorMessage2(error)}`,
        { cause: error }
      );
    }
    if (!compiled) {
      throw new Error(`Native analyzer returned no result for class "${className}".`);
    }
    cssChunks.push(compiled.css);
    resolvedClasses.push(...compiled.resolvedClasses);
    unknownClasses.push(...compiled.unknownClasses);
    sizeBytes += compiled.sizeBytes;
    mergeDeclarationMap(declarationMap, compiled.css);
  }
  const uniqueUnknown = Array.from(new Set(unknownClasses));
  if (normalizedOptions.strict && uniqueUnknown.length > 0) {
    throw new Error(`Unknown Tailwind classes: ${uniqueUnknown.join(", ")}`);
  }
  return {
    inputClasses,
    css: cssChunks.filter((chunk) => chunk.length > 0).join("\n"),
    declarations: declarationMapToString(declarationMap),
    resolvedClasses: Array.from(new Set(resolvedClasses)),
    unknownClasses: uniqueUnknown,
    sizeBytes
  };
}
var init_classToCss = __esm({
  "packages/analyzer/src/classToCss.ts"() {
    init_binding();
    init_utils();
  }
});

// packages/analyzer/src/index.ts
var src_exports = {};
__export(src_exports, {
  __internal: () => __internal,
  analyzeWorkspace: () => analyzeWorkspace,
  classToCss: () => classToCss
});
var __internal;
var init_src4 = __esm({
  "packages/analyzer/src/index.ts"() {
    init_analyzeWorkspace();
    init_classToCss();
    init_semantic();
    __internal = {
      normalizeClassInput,
      splitVariantAndBase,
      resolveConflictGroup,
      collectClassCounts,
      buildDistribution,
      utilityPrefix
    };
  }
});
async function pathExists2(filePath) {
  try {
    await fs5.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function readFileSafe(filePath) {
  try {
    return await fs5.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
async function readJsonSafe(filePath) {
  const raw = await readFileSafe(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function writeFileSafe(filePath, content, options = {}) {
  if (options.dryRun) {
    options.onDryRun?.(`write ${filePath}`);
    return;
  }
  await fs5.mkdir(path2.dirname(filePath), { recursive: true });
  await fs5.writeFile(filePath, content, "utf8");
}
async function ensureFileSafe(filePath, content, options = {}) {
  if (await pathExists2(filePath)) return "skipped";
  await writeFileSafe(filePath, content, options);
  return "created";
}
var init_fs = __esm({
  "packages/cli/src/utils/fs.ts"() {
  }
});

// packages/cli/node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "packages/cli/node_modules/picocolors/picocolors.js"(exports$1, module2) {
    var p = process || {};
    var argv = p.argv || [];
    var env = p.env || {};
    var isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
    var formatter = (open, close, replace = open) => (input) => {
      let string = "" + input, index = string.indexOf(close, open.length);
      return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
    var replaceClose = (string, close, replace, index) => {
      let result = "", cursor = 0;
      do {
        result += string.substring(cursor, index) + replace;
        cursor = index + close.length;
        index = string.indexOf(close, cursor);
      } while (~index);
      return result + string.substring(cursor);
    };
    var createColors = (enabled = isColorSupported) => {
      let f = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: f("\x1B[0m", "\x1B[0m"),
        bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: f("\x1B[3m", "\x1B[23m"),
        underline: f("\x1B[4m", "\x1B[24m"),
        inverse: f("\x1B[7m", "\x1B[27m"),
        hidden: f("\x1B[8m", "\x1B[28m"),
        strikethrough: f("\x1B[9m", "\x1B[29m"),
        black: f("\x1B[30m", "\x1B[39m"),
        red: f("\x1B[31m", "\x1B[39m"),
        green: f("\x1B[32m", "\x1B[39m"),
        yellow: f("\x1B[33m", "\x1B[39m"),
        blue: f("\x1B[34m", "\x1B[39m"),
        magenta: f("\x1B[35m", "\x1B[39m"),
        cyan: f("\x1B[36m", "\x1B[39m"),
        white: f("\x1B[37m", "\x1B[39m"),
        gray: f("\x1B[90m", "\x1B[39m"),
        bgBlack: f("\x1B[40m", "\x1B[49m"),
        bgRed: f("\x1B[41m", "\x1B[49m"),
        bgGreen: f("\x1B[42m", "\x1B[49m"),
        bgYellow: f("\x1B[43m", "\x1B[49m"),
        bgBlue: f("\x1B[44m", "\x1B[49m"),
        bgMagenta: f("\x1B[45m", "\x1B[49m"),
        bgCyan: f("\x1B[46m", "\x1B[49m"),
        bgWhite: f("\x1B[47m", "\x1B[49m"),
        blackBright: f("\x1B[90m", "\x1B[39m"),
        redBright: f("\x1B[91m", "\x1B[39m"),
        greenBright: f("\x1B[92m", "\x1B[39m"),
        yellowBright: f("\x1B[93m", "\x1B[39m"),
        blueBright: f("\x1B[94m", "\x1B[39m"),
        magentaBright: f("\x1B[95m", "\x1B[39m"),
        cyanBright: f("\x1B[96m", "\x1B[39m"),
        whiteBright: f("\x1B[97m", "\x1B[39m"),
        bgBlackBright: f("\x1B[100m", "\x1B[49m"),
        bgRedBright: f("\x1B[101m", "\x1B[49m"),
        bgGreenBright: f("\x1B[102m", "\x1B[49m"),
        bgYellowBright: f("\x1B[103m", "\x1B[49m"),
        bgBlueBright: f("\x1B[104m", "\x1B[49m"),
        bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
        bgCyanBright: f("\x1B[106m", "\x1B[49m"),
        bgWhiteBright: f("\x1B[107m", "\x1B[49m")
      };
    };
    module2.exports = createColors();
    module2.exports.createColors = createColors;
  }
});

// packages/cli/src/utils/json.ts
function toJsonSuccess(command, data) {
  const payload = {
    ok: true,
    error: false,
    command,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    data
  };
  return JSON.stringify(payload, null, 2);
}
function writeJsonSuccess(command, data) {
  process.stdout.write(`${toJsonSuccess(command, data)}
`);
}
var init_json = __esm({
  "packages/cli/src/utils/json.ts"() {
  }
});
function writeLine(stream, message = "") {
  stream.write(`${message}
`);
}
function createNoopSpinner() {
  return {
    start() {
    },
    stop() {
    },
    error() {
    },
    cancel() {
    },
    message() {
    },
    clear() {
    }
  };
}
function formatLabel(colorize, label, message) {
  return `${colorize(label)} ${message}`;
}
function createCliOutput(options = {}) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const json = Boolean(options.json);
  const debug = Boolean(options.debug);
  const verboseEnabled = Boolean(options.verbose);
  const interactive = !json && Boolean(process.stdin.isTTY) && isTTY(stdout);
  function writeText(message = "", writeOptions = {}) {
    writeLine(writeOptions.stderr || json ? stderr : stdout, message);
  }
  function showClackMessage(fn, fallback) {
    if (interactive) {
      fn(fallback);
      return;
    }
    writeText(fallback);
  }
  return {
    json,
    debug,
    verboseEnabled,
    interactive,
    writeText,
    info(message) {
      writeText(formatLabel(import_picocolors.default.cyan, "info", message));
    },
    success(message) {
      writeText(formatLabel(import_picocolors.default.green, "ok", message));
    },
    warn(message) {
      writeText(formatLabel(import_picocolors.default.yellow, "warn", message), { stderr: true });
    },
    error(message) {
      writeText(formatLabel(import_picocolors.default.red, "error", message), { stderr: true });
    },
    step(message) {
      writeText(formatLabel(import_picocolors.default.blue, "step", message));
    },
    note(message, title) {
      if (interactive) {
        note(message, title);
        return;
      }
      if (title) {
        writeText(`${title}
${message}`);
        return;
      }
      writeText(message);
    },
    intro(message) {
      showClackMessage(intro, message);
    },
    outro(message) {
      showClackMessage(outro, message);
    },
    table(rows) {
      writeText(JSON.stringify(rows, null, 2));
    },
    spinner() {
      if (!interactive) return createNoopSpinner();
      const instance = spinner({ output: stdout });
      return {
        start(message) {
          instance.start(message);
        },
        stop(message) {
          instance.stop(message);
        },
        error(message) {
          instance.error(message);
        },
        cancel(message) {
          instance.cancel(message);
        },
        message(message) {
          instance.message(message);
        },
        clear() {
          instance.clear();
        }
      };
    },
    verbose(message) {
      if (!verboseEnabled) return;
      writeText(import_picocolors.default.dim(message), { stderr: true });
    },
    jsonSuccess(command, data) {
      writeLine(stdout, toJsonSuccess(command, data));
    },
    jsonError(error, command) {
      writeLine(stdout, errorToJson(error, debug, command));
    },
    header(message) {
      writeText(`
${import_picocolors.default.bold(import_picocolors.default.cyan(message))}
`);
    },
    subHeader(message) {
      writeText(import_picocolors.default.bold(message));
    },
    listItem(message) {
      writeText(`  ${import_picocolors.default.dim("\u2022")} ${message}`);
    },
    footer(message) {
      writeText(`
${import_picocolors.default.dim(message)}
`);
    }
  };
}
var import_picocolors;
var init_output = __esm({
  "packages/cli/src/utils/output.ts"() {
    import_picocolors = __toESM(require_picocolors());
    init_errors();
    init_json();
  }
});
function hasFlag(name, argv) {
  return argv.includes(`--${name}`);
}
function ensureFlag(name, argv) {
  return hasFlag(name, argv) ? argv : [...argv, `--${name}`];
}
function firstPositional(argv) {
  return argv.find((arg) => !arg.startsWith("-"));
}
function parseCliInput(argv) {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false },
      debug: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false }
    }
  });
  const commandIndex = argv.findIndex((arg) => !arg.startsWith("-"));
  const command = commandIndex >= 0 ? argv[commandIndex] : void 0;
  const restArgs = commandIndex >= 0 ? argv.slice(commandIndex + 1) : [];
  const firstPositionalArg = parsed.positionals[0];
  const helpCommand = firstPositionalArg === "help" ? parsed.positionals[1] : parsed.values.help ? firstPositionalArg : void 0;
  return {
    argv,
    command,
    restArgs,
    json: Boolean(parsed.values.json),
    debug: Boolean(parsed.values.debug) || process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: Boolean(parsed.values.verbose) || process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1",
    help: Boolean(parsed.values.help) || firstPositionalArg === "help" || command === void 0 || command === "--help" || command === "-h",
    helpCommand
  };
}
var init_args = __esm({
  "packages/cli/src/utils/args.ts"() {
  }
});
function runtimeDirFromImportMeta(importMetaUrl) {
  const filename = fileURLToPath(importMetaUrl);
  return path2.dirname(filename);
}
async function resolveMonorepoPath(runtimeDir2, relativeToRepoRoot) {
  const fromRuntime = path2.resolve(runtimeDir2, "..", "..", "..", relativeToRepoRoot);
  const fromCwd = path2.resolve(process.cwd(), relativeToRepoRoot);
  return await pathExists2(fromRuntime) ? fromRuntime : fromCwd;
}
async function firstExistingPath(paths) {
  for (const candidate of paths) {
    if (await pathExists2(candidate)) return candidate;
  }
  return null;
}
var init_paths = __esm({
  "packages/cli/src/utils/paths.ts"() {
    init_errors();
    init_fs();
  }
});

// packages/cli/src/utils/runtime.ts
function isCommanderLikeError(error) {
  return error instanceof Error && typeof error.code === "string";
}
function isHelpExit(error) {
  return isCommanderLikeError(error) && error.code === "commander.helpDisplayed";
}
function normalizeCliError(error) {
  if (!isCommanderLikeError(error)) return error;
  if (!error.code?.startsWith("commander.")) return error;
  return new CliUsageError(error.message, { cause: error });
}
function findCommandByPath(program2, pathParts) {
  let current = program2;
  for (const part of pathParts) {
    const next = (current.commands ?? []).find((candidate) => {
      const alias = typeof candidate.alias === "function" ? candidate.alias() : void 0;
      return candidate.name() === part || alias === part;
    });
    if (!next) {
      throw new CliUsageError(`Unknown help topic: ${pathParts.join(" ")}`);
    }
    current = next;
  }
  return current;
}
function resolveCommandHelp(program2, pathParts) {
  return findCommandByPath(program2, pathParts).helpInformation();
}
function resolveHelpPath(argv) {
  const positional = argv.filter((arg) => !arg.startsWith("-"));
  if (argv.length === 0) return [];
  if (positional.length === 0) return [];
  if (positional[0] === "help") return positional.slice(1);
  if (argv.includes("--help") || argv.includes("-h")) return positional;
  return null;
}
function walkCommands(program2, visit) {
  visit(program2);
  for (const command of program2.commands ?? []) {
    walkCommands(command, visit);
  }
}
async function runCliMain(options) {
  const argv = options.argv ?? process.argv;
  const input = parseCliInput(argv.slice(2));
  if (input.verbose) process.env.TWS_VERBOSE = "1";
  if (input.debug) process.env.TWS_DEBUG = "1";
  const output = createCliOutput({
    json: input.json,
    debug: input.debug,
    verbose: input.verbose
  });
  const context = {
    runtimeDir: runtimeDirFromImportMeta(options.importMetaUrl),
    json: input.json,
    debug: input.debug,
    verbose: input.verbose,
    output,
    cwd: process.cwd()
  };
  const program2 = options.buildProgram(context);
  walkCommands(program2, (command) => {
    if (input.json) {
      command.configureOutput({
        writeOut() {
        },
        writeErr() {
        },
        outputError() {
        }
      });
    }
    command.exitOverride();
  });
  try {
    const helpPath = resolveHelpPath(argv.slice(2));
    if (input.json && helpPath) {
      output.jsonSuccess("help", {
        command: helpPath.length > 0 ? helpPath.join(" ") : null,
        text: resolveCommandHelp(program2, helpPath).trim()
      });
      return;
    }
    await program2.parseAsync(argv);
  } catch (error) {
    if (isHelpExit(error)) return;
    const normalized = normalizeCliError(error);
    if (input.json) {
      output.jsonError(normalized, options.commandHint ?? input.command);
    } else if (input.debug && normalized instanceof Error && normalized.stack) {
      output.writeText(normalized.stack, { stderr: true });
    } else if (normalized instanceof Error) {
      output.writeText(normalized.message, { stderr: true });
    } else {
      output.writeText(String(normalized), { stderr: true });
    }
    process.exitCode = errorExitCode(normalized);
  }
}
var init_runtime = __esm({
  "packages/cli/src/utils/runtime.ts"() {
    init_args();
    init_errors();
    init_output();
    init_paths();
  }
});

// packages/cli/src/createApp.ts
var createApp_exports = {};
__export(createApp_exports, {
  buildCreateProgram: () => buildCreateProgram,
  main: () => main
});
function isTemplateName(value) {
  return TEMPLATE_NAMES.includes(value);
}
function isInteractiveSession() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}
async function resolveCreateInput(options) {
  const interactive = isInteractiveSession();
  const resolvedName = options.name ? options.name : options.yes || !interactive ? "my-app" : await text({
    message: "Project name",
    defaultValue: "my-app",
    placeholder: "my-app"
  });
  if (isCancel(resolvedName)) {
    throw new CliUsageError("Create prompt dibatalkan oleh pengguna");
  }
  const pickedTemplate = options.template ? options.template : options.yes || !interactive ? "next-app" : await select({
    message: "Template",
    initialValue: "next-app",
    options: TEMPLATE_NAMES.map((template) => ({
      value: template,
      label: template
    }))
  });
  if (isCancel(pickedTemplate)) {
    throw new CliUsageError("Create prompt dibatalkan oleh pengguna");
  }
  const templateValue = pickedTemplate;
  if (!isTemplateName(templateValue)) {
    throw new CliUsageError(
      `Unknown template: ${templateValue}. Valid templates: ${TEMPLATE_NAMES.join(", ")}`
    );
  }
  return { name: resolvedName, template: templateValue };
}
async function writeProjectFile(context, relativePath, content) {
  const filePath = path2.join(context.projectDir, relativePath);
  await writeFileSafe(filePath, content, { dryRun: context.dryRun });
  context.writtenFiles.push(relativePath.replaceAll("\\", "/"));
}
async function createNextApp(context) {
  await writeProjectFile(
    context,
    "package.json",
    JSON.stringify(
      {
        name: context.name,
        version: "0.1.0",
        private: true,
        scripts: { dev: "next dev --turbopack", build: "next build", start: "next start" },
        dependencies: {
          next: "^15",
          react: "^19",
          "react-dom": "^19",
          "tailwind-styled-v4": "^5.0.0",
          "@tailwind-styled/next": "^5.0.0"
        },
        devDependencies: {
          tailwindcss: "^4",
          typescript: "^5",
          "@types/react": "^19",
          "@types/node": "^20"
        }
      },
      null,
      2
    ) + "\n"
  );
  await writeProjectFile(
    context,
    "next.config.ts",
    `import type { NextConfig } from "next"
import { withTailwindStyled } from "@tailwind-styled/next"

const nextConfig: NextConfig = {}
export default withTailwindStyled()(nextConfig)
`
  );
  await writeProjectFile(context, "src/app/globals.css", '@import "tailwindcss";\n');
  await writeProjectFile(
    context,
    "src/app/layout.tsx",
    `import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
`
  );
  await writeProjectFile(
    context,
    "src/app/page.tsx",
    `import { tw } from "tailwind-styled-v4"

const Page = tw.main\`min-h-screen grid place-items-center bg-zinc-950 text-white\`

export default function HomePage() {
  return <Page>${context.name}</Page>
}
`
  );
}
async function createViteReactApp(context) {
  await writeProjectFile(
    context,
    "package.json",
    JSON.stringify(
      {
        name: context.name,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19", "react-dom": "^19", "tailwind-styled-v4": "^5.0.0" },
        devDependencies: {
          "@tailwind-styled/vite": "^5.0.0",
          vite: "^6",
          "@vitejs/plugin-react": "^4",
          tailwindcss: "^4",
          typescript: "^5"
        }
      },
      null,
      2
    ) + "\n"
  );
  await writeProjectFile(
    context,
    "vite.config.ts",
    `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tailwindStyledPlugin } from "@tailwind-styled/vite"

export default defineConfig({ plugins: [react(), tailwindStyledPlugin()] })
`
  );
  await writeProjectFile(
    context,
    "src/main.tsx",
    `console.log("${context.name} - vite react template")
`
  );
}
async function createViteVueApp(context) {
  await writeProjectFile(
    context,
    "package.json",
    JSON.stringify(
      {
        name: context.name,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: {
          vue: "^3.4.0",
          "tailwind-merge": "^3.5.0",
          "@tailwind-styled/vue": "^5.0.0"
        },
        devDependencies: {
          vite: "^5.0.0",
          "@vitejs/plugin-vue": "^5.0.0",
          typescript: "^5.0.0",
          tailwindcss: "^4.0.0",
          "@tailwindcss/vite": "^4.0.0"
        }
      },
      null,
      2
    ) + "\n"
  );
  await writeProjectFile(
    context,
    "vite.config.ts",
    `import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
`
  );
  await writeProjectFile(
    context,
    "src/main.ts",
    `import { createApp } from "vue"
import { TailwindStyledPlugin } from "@tailwind-styled/vue"
import App from "./App.vue"
import "./style.css"

createApp(App).use(TailwindStyledPlugin).mount("#app")
`
  );
  await writeProjectFile(
    context,
    "src/App.vue",
    `<script setup lang="ts">
import { ref } from "vue"
import { tw } from "@tailwind-styled/vue"

const Button = tw("button", {
  base: "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2",
  variants: {
    intent: {
      primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
      ghost: "bg-transparent border border-gray-200 hover:bg-gray-50 focus:ring-gray-200",
    },
  },
  defaultVariants: { intent: "primary" },
})

const count = ref(0)
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
    <h1 class="text-3xl font-bold text-gray-900">tailwind-styled + Vue 3</h1>
    <Button @click="count++">Count: {{ count }}</Button>
    <Button intent="ghost" @click="count = 0">Reset</Button>
  </div>
</template>
`
  );
  await writeProjectFile(
    context,
    "src/style.css",
    `@import "tailwindcss";
`
  );
  await writeProjectFile(
    context,
    "index.html",
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${context.name}</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
`
  );
}
async function createViteSvelteApp(context) {
  await writeProjectFile(
    context,
    "package.json",
    JSON.stringify(
      {
        name: context.name,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { "tailwind-merge": "^3.5.0", "@tailwind-styled/svelte": "^5.0.0" },
        devDependencies: {
          svelte: "^5.0.0",
          "@sveltejs/vite-plugin-svelte": "^3.0.0",
          vite: "^5.0.0",
          typescript: "^5.0.0",
          tailwindcss: "^4.0.0",
          "@tailwindcss/vite": "^4.0.0"
        }
      },
      null,
      2
    ) + "\n"
  );
  await writeProjectFile(
    context,
    "vite.config.ts",
    `import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
})
`
  );
  await writeProjectFile(
    context,
    "src/main.ts",
    `import App from "./App.svelte"
import "./app.css"

const app = new App({ target: document.getElementById("app")! })
export default app
`
  );
  await writeProjectFile(
    context,
    "src/App.svelte",
    `<script lang="ts">
  import { cv } from "@tailwind-styled/svelte"

  const button = cv({
    base: "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none",
    variants: {
      intent: {
        primary: "bg-blue-500 text-white hover:bg-blue-600",
        ghost: "bg-transparent border border-gray-200 hover:bg-gray-50",
      },
    },
    defaultVariants: { intent: "primary" },
  })

  let count = 0
</script>

<div class="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
  <h1 class="text-3xl font-bold text-gray-900">tailwind-styled + Svelte 5</h1>
  <button class={button({ intent: "primary" })} on:click={() => count++}>Count: {count}</button>
  <button class={button({ intent: "ghost" })} on:click={() => (count = 0)}>Reset</button>
</div>
`
  );
  await writeProjectFile(
    context,
    "src/app.css",
    `@import "tailwindcss";
`
  );
  await writeProjectFile(
    context,
    "index.html",
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${context.name}</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
`
  );
}
async function createSimpleApp(context) {
  await writeProjectFile(
    context,
    "package.json",
    JSON.stringify(
      { name: context.name, private: true, scripts: { dev: "node index.js" } },
      null,
      2
    ) + "\n"
  );
  await writeProjectFile(
    context,
    "index.js",
    "console.log('tailwind-styled simple template ready')\n"
  );
}
async function createProject(options, output) {
  const { name, template } = await resolveCreateInput(options);
  const projectDir = path2.resolve(process.cwd(), name);
  if (await pathExists2(projectDir)) {
    throw new CliUsageError(`Directory ${name} already exists.`);
  }
  const context = {
    projectDir,
    name,
    dryRun: options.dryRun,
    writtenFiles: []
  };
  await TEMPLATES[template](context);
  const report = {
    name,
    template,
    projectDir,
    dryRun: context.dryRun,
    filesCreated: context.writtenFiles.length,
    files: context.writtenFiles
  };
  if (output.json) {
    output.jsonSuccess("create", report);
    return;
  }
  output.intro("tailwind-styled-v4 Project Generator");
  output.writeText(`Creating ${template} in ./${name}${context.dryRun ? " (dry-run)" : ""}`);
  output.writeText(`Files ${context.dryRun ? "planned" : "created"}: ${report.filesCreated}`);
  output.note(`cd ${name}
npm install
npm run dev`, "Next steps");
  output.outro("Project scaffold ready");
}
function buildCreateProgram(context) {
  const program2 = new Command("create-tailwind-styled");
  program2.name("create-tailwind-styled").description("CLI scaffolding tool").option("--json", "Output strict JSON envelope").option("--debug", "Include stack traces for errors").option("--verbose", "Verbose runtime logs").arguments("[name]").option("-y, --yes", "Skip prompts").option("--template <template>", "Template name").option("--dry-run", "Preview generated files").action(async (name, options) => {
    await createProject(
      {
        name,
        template: typeof options.template === "string" ? options.template : void 0,
        yes: Boolean(options.yes),
        dryRun: Boolean(options.dryRun)
      },
      context.output
    );
  });
  return program2;
}
async function main(rawArgs = process.argv.slice(2)) {
  await runCliMain({
    argv: [process.execPath, "create-tailwind-styled", ...rawArgs],
    importMetaUrl: import.meta.url,
    commandHint: "create",
    buildProgram: buildCreateProgram
  });
}
function isDirectExecution() {
  const scriptPath = process.argv[1];
  if (!scriptPath) return false;
  return import.meta.url === pathToFileURL(scriptPath).href;
}
var TEMPLATE_NAMES, TEMPLATES;
var init_createApp = __esm({
  async "packages/cli/src/createApp.ts"() {
    init_esm();
    init_errors();
    init_fs();
    init_runtime();
    TEMPLATE_NAMES = ["next-app", "vite-react", "vite-vue", "vite-svelte", "simple"];
    TEMPLATES = {
      "next-app": createNextApp,
      "vite-react": createViteReactApp,
      "vite-vue": createViteVueApp,
      "vite-svelte": createViteSvelteApp,
      simple: createSimpleApp
    };
    if (isDirectExecution()) {
      await main();
    }
  }
});

// packages/cli/src/commands/program.ts
init_esm();

// packages/cli/src/analyze.ts
init_errors();

// packages/cli/src/utils/analyzer.ts
init_errors();
async function loadAnalyzerModule() {
  try {
    const mod = await Promise.resolve().then(() => (init_src4(), src_exports));
    if (typeof mod.analyzeWorkspace !== "function") {
      throw new Error("analyzeWorkspace export not found");
    }
    return {
      analyzeWorkspace: mod.analyzeWorkspace
    };
  } catch (error) {
    throw new CliError(
      "Native analyzer binding is unavailable. Reinstall dependencies or run `npm rebuild @tailwind-styled/analyzer`.",
      {
        code: "ANALYZER_BINDING_UNAVAILABLE",
        cause: error
      }
    );
  }
}

// packages/cli/src/analyze.ts
init_fs();
init_output();
function printAnalysisReport(report, output) {
  const bar = "-".repeat(55);
  output.writeText(`
+${bar}+`);
  output.writeText(`|  tailwind-styled-v4 - CSS Analyzer${" ".repeat(21)}|`);
  output.writeText(`+${bar}+`);
  output.writeText(`|  Files scanned:     ${String(report.totalFiles).padEnd(34)}|`);
  output.writeText(`|  Unique classes:    ${String(report.uniqueClassCount).padEnd(34)}|`);
  output.writeText(`|  Total occurrences: ${String(report.totalClassOccurrences).padEnd(34)}|`);
  output.writeText(`|  Frequent classes:  ${String(report.classStats.frequent.length).padEnd(34)}|`);
  output.writeText(`+${bar}+`);
  if (report.classStats.frequent.length > 0) {
    output.writeText("\n  MOST FREQUENT (top 10)");
    output.writeText(`  ${"-".repeat(52)}`);
    for (const usage of report.classStats.frequent.slice(0, 10)) {
      const chart = "#".repeat(Math.min(usage.count * 2, 20));
      output.writeText(`  ${usage.name.padEnd(32)} ${chart} ${usage.count}`);
    }
  }
  if (report.classStats.top.length > 0) {
    output.writeText("\n  TOP CLASSES");
    output.writeText(`  ${"-".repeat(52)}`);
    for (const usage of report.classStats.top.slice(0, 10)) {
      const chart = "#".repeat(Math.min(usage.count * 2, 20));
      output.writeText(`  ${usage.name.padEnd(32)} ${chart} ${usage.count}`);
    }
  }
  output.writeText("");
}
async function runAnalyzeCli(args) {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false }
    }
  });
  const jsonFlag = Boolean(parsed.values.json);
  const output = createCliOutput({
    json: jsonFlag,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const dirArg = parsed.positionals[0] ?? ".";
  const dir = path2.resolve(process.cwd(), dirArg);
  if (!await pathExists2(dir)) {
    throw new CliUsageError(`Directory not found: ${dir}`);
  }
  const analyzer = await loadAnalyzerModule();
  const spinner = output.spinner();
  spinner.start(`Analyzing ${dir}`);
  const report = await analyzer.analyzeWorkspace(dir, {
    classStats: { top: 20, frequentThreshold: 2 }
  });
  spinner.stop(`Analysis complete: ${report.totalFiles} file(s)`);
  if (jsonFlag) {
    output.jsonSuccess("analyze", report);
    return;
  }
  printAnalysisReport(report, output);
}
init_errors();
init_fs();
init_output();
function guessSuggestedName(pattern) {
  if (pattern.includes("flex") && pattern.includes("items-center")) return "HStack";
  if (pattern.includes("flex") && pattern.includes("flex-col")) return "VStack";
  if (pattern.includes("rounded") && pattern.includes("shadow")) return "Card";
  if (pattern.includes("btn") || pattern.includes("px-") && pattern.includes("py-") && pattern.includes("rounded")) {
    return "Button";
  }
  if (pattern.includes("text-sm") || pattern.includes("text-xs")) return "Caption";
  const first = pattern.split(" ")[0];
  return first.replace(/[^a-zA-Z]/g, "").replace(/^(.)/, (char) => char.toUpperCase()) + "Base";
}
function guessSuggestedTag(pattern) {
  if (pattern.includes("text-") && !pattern.includes("bg-")) return "span";
  if (pattern.includes("btn") || pattern.includes("cursor-pointer")) return "button";
  return "div";
}
async function runExtractCli(args) {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false },
      min: { type: "string" }
    }
  });
  const jsonFlag = Boolean(parsed.values.json);
  const output = createCliOutput({
    json: jsonFlag,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const minRaw = typeof parsed.values.min === "string" ? parsed.values.min : "2";
  const parsedMin = parseInt(minRaw, 10);
  const minCount = Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 2;
  const dirArg = parsed.positionals[0] ?? ".";
  const dir = path2.resolve(process.cwd(), dirArg);
  if (!await pathExists2(dir)) {
    throw new CliUsageError(`Directory not found: ${dir}`);
  }
  const analyzer = await loadAnalyzerModule();
  const spinner = output.spinner();
  spinner.start(`Scanning extraction candidates in ${dir}`);
  const report = await analyzer.analyzeWorkspace(dir, {
    classStats: { top: 50, frequentThreshold: 2 }
  });
  spinner.stop(`Extraction scan complete: ${report.totalFiles} file(s)`);
  const candidates = report.classStats.frequent.filter((usage) => usage.count >= minCount).map((usage) => {
    const suggestedName = guessSuggestedName(usage.name);
    const suggestedTag = guessSuggestedTag(usage.name);
    const suggestedCode = `export const ${suggestedName} = tw.${suggestedTag}\`${usage.name}\``;
    const savings = (usage.count - 1) * usage.name.length;
    return {
      pattern: usage.name,
      count: usage.count,
      suggestedName,
      suggestedTag,
      suggestedCode,
      savings
    };
  }).sort((left, right) => right.savings - left.savings);
  if (jsonFlag) {
    output.jsonSuccess("extract", {
      root: dir,
      totalFiles: report.totalFiles,
      candidates
    });
    return;
  }
  const bar = "-".repeat(55);
  output.writeText(`
+${bar}+`);
  output.writeText(`|  tailwind-styled-v4 - Extract Suggestions${" ".repeat(13)}|`);
  output.writeText(`+${bar}+`);
  output.writeText(`|  Files scanned:     ${String(report.totalFiles).padEnd(34)}|`);
  output.writeText(`|  Candidates found:  ${String(candidates.length).padEnd(34)}|`);
  output.writeText(`+${bar}+`);
  if (candidates.length === 0) {
    output.writeText("\n  No extraction candidates found (all classes are unique).\n");
    return;
  }
  for (const candidate of candidates.slice(0, 15)) {
    output.writeText(`
  PATTERN: "${candidate.pattern}"`);
    output.writeText(`  Found ${candidate.count} times - ~${candidate.savings} chars saved`);
    output.writeText(`  -> ${candidate.suggestedCode}`);
  }
  output.writeText("");
}

// packages/cli/src/init.ts
init_fs();
init_output();
async function ensureFile(filePath, content, report) {
  const status = await ensureFileSafe(filePath, content);
  if (status === "created") {
    report.created.push(filePath);
  } else {
    report.skipped.push(filePath);
  }
}
async function runInitCli(rawArgs) {
  const asJson = rawArgs.includes("--json");
  const output = createCliOutput({
    json: asJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const target = rawArgs.find((arg) => !arg.startsWith("-")) ?? ".";
  const root = path2.resolve(process.cwd(), target);
  const report = { created: [], skipped: [] };
  await ensureFile(
    path2.join(root, "src", "tailwind.css"),
    '@import "tailwindcss";\n\n@theme {\n  --color-primary: #3b82f6;\n  --spacing-section: 3rem;\n}\n',
    report
  );
  await ensureFile(
    path2.join(root, "tailwind-styled.config.json"),
    JSON.stringify(
      {
        version: 1,
        cssEntry: "src/tailwind.css"
      },
      null,
      2
    ) + "\n",
    report
  );
  if (asJson) {
    output.jsonSuccess("init", report);
    return;
  }
  output.writeText("\nInit complete");
  output.writeText(`Created: ${report.created.length}`);
  for (const filePath of report.created) {
    output.writeText(`  + ${path2.relative(root, filePath)}`);
  }
  if (report.skipped.length > 0) {
    output.writeText(`Skipped: ${report.skipped.length}`);
    for (const filePath of report.skipped) {
      output.writeText(`  - ${path2.relative(root, filePath)} (exists)`);
    }
  }
}

// packages/cli/src/migrateWizard.ts
init_errors();
async function runMigrationWizard() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return {
      dryRun: true,
      includeConfig: true,
      includeClasses: true,
      includeImports: true
    };
  }
  intro("Tailwind Styled v4 Migration Wizard");
  const dryRun = await confirm({
    message: "Gunakan dry-run?",
    initialValue: true
  });
  const includeConfig = await confirm({
    message: "Migrasi file config dasar?",
    initialValue: true
  });
  const includeClasses = await confirm({
    message: "Migrasi class lama (flex-grow/shrink)?",
    initialValue: true
  });
  const includeImports = await confirm({
    message: "Migrasi import tailwind-styled-components -> tailwind-styled-v4?",
    initialValue: true
  });
  if ([dryRun, includeConfig, includeClasses, includeImports].some((value) => isCancel(value))) {
    throw new CliUsageError("Migration wizard dibatalkan oleh pengguna");
  }
  return {
    dryRun,
    includeConfig,
    includeClasses,
    includeImports
  };
}

// packages/cli/src/migrate.ts
init_args();
init_fs();
init_output();
var SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
var IGNORED_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", ".next", "out", ".turbo"]);
var DEFAULT_TAILWIND_CSS = `@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --spacing-section: 3rem;
}
`;
async function findSourceFiles(dir) {
  const out = [];
  async function walk(currentDir) {
    if (!await pathExists2(currentDir)) return;
    const entries = await fs5.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path2.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }
      if (SOURCE_EXTENSIONS.has(path2.extname(entry.name))) {
        out.push(fullPath);
      }
    }
  }
  await walk(dir);
  return out;
}
function migrateSource(source, options) {
  let output = source;
  let classRenames = 0;
  let importRenames = 0;
  if (options.includeImports) {
    output = output.replace(/tailwind-styled-components/g, () => {
      importRenames++;
      return "tailwind-styled-v4";
    });
  }
  if (options.includeClasses) {
    output = output.replace(/\bflex-grow\b/g, () => {
      classRenames++;
      return "grow";
    });
    output = output.replace(/\bflex-shrink\b/g, () => {
      classRenames++;
      return "shrink";
    });
  }
  return { output, classRenames, importRenames };
}
async function migrateConfig(root, dryRun) {
  const cssPath = path2.join(root, "src", "tailwind.css");
  if (await pathExists2(cssPath)) return 0;
  await writeFileSafe(cssPath, DEFAULT_TAILWIND_CSS, { dryRun });
  return 1;
}
async function runMigrateCli(rawArgs) {
  const asJson = hasFlag("json", rawArgs);
  const output = createCliOutput({
    json: asJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const target = firstPositional(rawArgs) ?? ".";
  const root = path2.resolve(process.cwd(), target);
  let dryRun = hasFlag("dry-run", rawArgs);
  let includeConfig = true;
  let includeClasses = true;
  let includeImports = true;
  if (hasFlag("wizard", rawArgs)) {
    const picked = await runMigrationWizard();
    dryRun = picked.dryRun;
    includeConfig = picked.includeConfig;
    includeClasses = picked.includeClasses;
    includeImports = picked.includeImports;
  }
  const spinner = output.spinner();
  spinner.start(`Scanning source files in ${root}`);
  const files = await findSourceFiles(root);
  const report = {
    scannedFiles: files.length,
    updatedFiles: 0,
    classRenames: 0,
    importRenames: 0,
    configWrites: 0,
    dryRun
  };
  if (includeConfig) {
    report.configWrites += await migrateConfig(root, dryRun);
  }
  for (const filePath of files) {
    const source = await fs5.readFile(filePath, "utf8");
    const migrated = migrateSource(source, { includeImports, includeClasses });
    if (migrated.output !== source) {
      report.updatedFiles++;
      if (!dryRun) {
        await fs5.writeFile(filePath, migrated.output, "utf8");
      }
    }
    report.classRenames += migrated.classRenames;
    report.importRenames += migrated.importRenames;
  }
  spinner.stop(`Migration scan complete: ${report.scannedFiles} file(s)`);
  if (asJson) {
    output.jsonSuccess("migrate", report);
    return;
  }
  output.writeText("\nMigration report");
  output.writeText(`Scanned files : ${report.scannedFiles}`);
  output.writeText(`Updated files : ${report.updatedFiles}${dryRun ? " (dry-run)" : ""}`);
  output.writeText(`Class renames : ${report.classRenames}`);
  output.writeText(`Import renames: ${report.importRenames}`);
  output.writeText(`Config writes : ${report.configWrites}${dryRun ? " (dry-run)" : ""}`);
}

// packages/cli/src/scan.ts
init_src3();
init_output();
function buildTopClasses(files) {
  const counts = /* @__PURE__ */ new Map();
  for (const file of files) {
    for (const className of file.classes) {
      counts.set(className, (counts.get(className) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
}
async function runScanCli(rawArgs) {
  const target = rawArgs.find((arg) => !arg.startsWith("-")) ?? ".";
  const asJson = rawArgs.includes("--json");
  const output = createCliOutput({
    json: asJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const root = path2.resolve(process.cwd(), target);
  const spinner = output.spinner();
  spinner.start(`Scanning ${root}`);
  const scanned = await scanWorkspaceAsync(root);
  spinner.stop(`Scan complete: ${scanned.totalFiles} file(s)`);
  const result = {
    root,
    totalFiles: scanned.totalFiles,
    uniqueClassCount: scanned.uniqueClasses.length,
    topClasses: buildTopClasses(scanned.files)
  };
  if (asJson) {
    output.jsonSuccess("scan", result);
    return;
  }
  output.writeText(`
Scan root       : ${result.root}`);
  output.writeText(`Total files     : ${result.totalFiles}`);
  output.writeText(`Unique classes  : ${result.uniqueClassCount}`);
  output.writeText("\nTop classes:");
  for (const item of result.topClasses.slice(0, 10)) {
    output.writeText(`  - ${item.name}: ${item.count}`);
  }
}

// packages/cli/src/commands/setup/prompt.ts
init_errors();
async function pickProjectTypeInteractive(detected, flags, projectOptions, options = {}) {
  const log3 = options.log ?? console.log;
  if (flags.explicitProjectType) {
    const label = projectOptions.find((option) => option.value === flags.explicitProjectType)?.label ?? flags.explicitProjectType;
    log3(`  Project type dipaksa via flag: ${label}
`);
    return flags.explicitProjectType;
  }
  if (flags.isYes) {
    const selected2 = detected ?? "next";
    const label = projectOptions.find((option) => option.value === selected2)?.label ?? selected2;
    log3(`  --yes aktif, pilih default: ${label}
`);
    return selected2;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const selected2 = detected ?? "next";
    const label = projectOptions.find((option) => option.value === selected2)?.label ?? selected2;
    log3(`  Non-interactive shell terdeteksi, pilih default: ${label}
`);
    return selected2;
  }
  log3("  Pilih project type:\n");
  projectOptions.forEach((option, index) => {
    const mark = detected === option.value ? " <- terdeteksi" : "";
    log3(`    ${index + 1}. ${option.label}${mark}`);
  });
  log3("");
  const defaultIdx = detected ? projectOptions.findIndex((option) => option.value === detected) : 0;
  const selected = await select({
    message: "Project type",
    initialValue: projectOptions[defaultIdx].value,
    options: projectOptions.map((option) => ({
      value: option.value,
      label: option.label,
      hint: detected === option.value ? "terdeteksi" : void 0
    })),
    output: options.output
  });
  if (isCancel(selected)) {
    throw new CliUsageError("Prompt dibatalkan oleh pengguna");
  }
  const selectedLabel = projectOptions.find((option) => option.value === selected)?.label ?? selected;
  log3(`
  -> ${selectedLabel} dipilih.
`);
  return selected;
}

// packages/cli/src/commands/setup/patchers.ts
function patchNextConfigImpl(src) {
  if (src.includes("withTailwindStyled")) return null;
  const hasExport = src.includes("export default");
  const hasCjs = src.includes("module.exports");
  if (hasExport) {
    const withImport = `import { withTailwindStyled } from "@tailwind-styled/next"
${src}`;
    return withImport.replace(
      /export default\s+([\w]+);?\s*$/m,
      (_match, expr) => `export default withTailwindStyled()(${expr})`
    ).replace(
      /export default\s+(defineConfig\([\s\S]*?\));?\s*$/m,
      (_match, expr) => `export default withTailwindStyled()(${expr})`
    ).replace(
      /export default\s+(\{[\s\S]*?\});?\s*$/m,
      (_match, expr) => `export default withTailwindStyled()(${expr})`
    );
  }
  if (hasCjs) {
    return `const { withTailwindStyled } = require("@tailwind-styled/next")
` + src.replace(
      /module\.exports\s*=\s*(.+)/s,
      (_match, expr) => `module.exports = withTailwindStyled()(${expr.trim()})`
    );
  }
  return null;
}
function patchViteConfigImpl(src) {
  const hasLegacyImport = src.includes("tailwind-styled-v4/vite");
  let patched = src;
  if (hasLegacyImport) {
    patched = patched.replace(
      /from\s+['"]tailwind-styled-v4\/vite['"]/g,
      'from "@tailwind-styled/vite"'
    );
  }
  patched = patched.replace(/\btailwindStyled\(/g, "tailwindStyledPlugin(");
  const alreadyConfigured = patched.includes("@tailwind-styled/vite") && patched.includes("tailwindStyledPlugin(");
  if (alreadyConfigured) return patched === src ? null : patched;
  const viteImportMatch = patched.match(/(import .+ from ['"]vite['"][^\n]*\n)/);
  const reactImportMatch = patched.match(/(import .+ from ['"]@vitejs\/plugin-react['"][^\n]*\n)/);
  const insertAfter = (reactImportMatch ?? viteImportMatch)?.[1];
  if (!patched.includes("@tailwind-styled/vite") && insertAfter) {
    patched = patched.replace(
      insertAfter,
      `${insertAfter}import { tailwindStyledPlugin } from "@tailwind-styled/vite"
`
    );
  } else if (!patched.includes("@tailwind-styled/vite")) {
    patched = `import { tailwindStyledPlugin } from "@tailwind-styled/vite"
${patched}`;
  }
  if (!patched.includes("tailwindStyledPlugin(")) {
    const withPluginArray = patched.replace(
      /plugins:\s*\[([^\]]*)\]/s,
      (_match, inner) => `plugins: [${inner.trimEnd()}
    tailwindStyledPlugin(),
  ]`
    );
    if (withPluginArray !== patched) {
      patched = withPluginArray;
    } else {
      patched = patched.replace(
        /(export default defineConfig\(\{[\s\S]*?)(\}\))/,
        (_match, body, close) => `${body}  plugins: [tailwindStyledPlugin()],
${close}`
      );
    }
  }
  return patched === src ? null : patched;
}
function patchRspackConfigImpl(src) {
  const hasModernImport = src.includes("@tailwind-styled/rspack");
  const hasLegacyImport = src.includes("tailwind-styled-v4/rspack");
  let patched = src;
  if (hasLegacyImport) {
    patched = patched.replace(
      /from\s+['"]tailwind-styled-v4\/rspack['"]/g,
      'from "@tailwind-styled/rspack"'
    );
  }
  patched = patched.replace(/\btailwindStyled\(/g, "tailwindStyledRspackPlugin(");
  const alreadyConfigured = patched.includes("@tailwind-styled/rspack") && patched.includes("tailwindStyledRspackPlugin(");
  if (alreadyConfigured) return patched === src ? null : patched;
  if (!patched.includes("@tailwind-styled/rspack") && !hasModernImport) {
    const lines = patched.split("\n");
    let lastImportIdx = 0;
    lines.forEach((line, index) => {
      if (line.trimStart().startsWith("import ")) lastImportIdx = index;
    });
    lines.splice(
      lastImportIdx + 1,
      0,
      'import { tailwindStyledRspackPlugin } from "@tailwind-styled/rspack"'
    );
    patched = lines.join("\n");
  }
  if (!patched.includes("tailwindStyledRspackPlugin(")) {
    if (patched.includes("plugins:")) {
      patched = patched.replace(
        /plugins:\s*\[([^\]]*)\]/s,
        (_match, inner) => `plugins: [${inner.trimEnd()}
    tailwindStyledRspackPlugin(),
  ]`
      );
    } else {
      patched = patched.replace(
        /(export default defineConfig\(\{[\s\S]*?)(\}\))/,
        (_match, body, close) => `${body}  plugins: [tailwindStyledRspackPlugin()],
${close}`
      );
    }
  }
  return patched === src ? null : patched;
}
function patchTailwindCssImpl(src) {
  if (src.includes('@import "tailwindcss"') || src.includes("@import 'tailwindcss'")) return null;
  return `@import "tailwindcss";

${src}`;
}
function patchTsConfigImpl(src) {
  try {
    const json = JSON.parse(src);
    const compilerOptions = json.compilerOptions ?? {};
    let changed = false;
    if (!compilerOptions.paths) {
      compilerOptions.paths = {};
      changed = true;
    }
    if (compilerOptions.strict === void 0) {
      compilerOptions.strict = true;
      changed = true;
    }
    if (compilerOptions.moduleResolution !== "bundler" && compilerOptions.moduleResolution !== "node16") {
      compilerOptions.moduleResolution = "bundler";
      changed = true;
    }
    if (!compilerOptions.jsx) {
      compilerOptions.jsx = "react-jsx";
      changed = true;
    }
    if (!changed) return null;
    json.compilerOptions = compilerOptions;
    return `${JSON.stringify(json, null, 2)}
`;
  } catch {
    return null;
  }
}

// packages/cli/src/commands/setup/workspace.ts
init_fs();

// packages/cli/src/utils/process.ts
init_errors();
init_json();
function npmCommandName() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
function npxCommandName() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}
function codeCommandName() {
  return process.platform === "win32" ? "code.cmd" : "code";
}
function shellQuote(value) {
  if (value.length === 0) return '""';
  if (!/[^\w./:=@-]/.test(value)) return value;
  return JSON.stringify(value);
}
function formatCommand(binary, args) {
  return [binary, ...args].map(shellQuote).join(" ");
}
function isVerboseEnabled(options) {
  if (options.verbose) return true;
  if (options.env?.TWS_VERBOSE === "1") return true;
  return process.env.TWS_VERBOSE === "1";
}
function writeVerboseLine(binary, args) {
  console.error(`  [verbose] $ ${formatCommand(binary, args)}`);
}
async function runCommand(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (isVerboseEnabled(options)) {
      writeVerboseLine(binary, args);
    }
    const child = spawn(binary, args, {
      stdio: options.stdio ?? "inherit",
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env
    });
    child.on("error", (error) => {
      reject(
        new CliError(`Failed to run command: ${binary} ${args.join(" ")}`, {
          cause: error
        })
      );
    });
    child.on("exit", (code) => {
      const exitCode = code ?? 0;
      if (exitCode !== 0 && !options.allowNonZeroExit) {
        reject(
          new CliError(`Command exited with code ${exitCode}: ${binary} ${args.join(" ")}`, {
            exitCode,
            code: "COMMAND_EXIT_NON_ZERO"
          })
        );
        return;
      }
      resolve(exitCode);
    });
  });
}
function parseCommandOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { outputFormat: "empty", output: null };
  }
  try {
    return {
      outputFormat: "json",
      output: JSON.parse(trimmed)
    };
  } catch {
    return {
      outputFormat: "text",
      output: stdout.trimEnd()
    };
  }
}
function formatCommandFailureOutput(stdout, stderr) {
  const errorText = stderr.trim();
  if (errorText) return errorText;
  const outputText = stdout.trim();
  if (outputText) return outputText;
  return "Command failed with no output.";
}
async function runCommandCapture(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (isVerboseEnabled(options)) {
      writeVerboseLine(binary, args);
    }
    const child = spawn(binary, args, {
      stdio: "pipe",
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(
        new CliError(`Failed to run command: ${binary} ${args.join(" ")}`, {
          cause: error
        })
      );
    });
    child.on("exit", (code) => {
      const exitCode = code ?? 0;
      if (exitCode !== 0 && !options.allowNonZeroExit) {
        reject(
          new CliError(
            `Command exited with code ${exitCode}: ${binary} ${args.join(" ")}
${formatCommandFailureOutput(stdout, stderr)}`,
            {
              exitCode,
              code: "COMMAND_EXIT_NON_ZERO"
            }
          )
        );
        return;
      }
      resolve({
        exitCode,
        stdout,
        stderr
      });
    });
  });
}
async function runCommandAsJson(command, binary, args, options = {}) {
  const captured = await runCommandCapture(binary, args, options);
  const parsed = parseCommandOutput(captured.stdout);
  writeJsonSuccess(command, {
    exitCode: captured.exitCode,
    outputFormat: parsed.outputFormat,
    output: parsed.output,
    stderr: captured.stderr.trim() || null
  });
}

// packages/cli/src/commands/setup/workspace.ts
function resolveExplicitProjectType(rawFlags) {
  if (rawFlags.has("--next")) return "next";
  if (rawFlags.has("--vite")) return "vite";
  if (rawFlags.has("--rspack")) return "rspack";
  if (rawFlags.has("--react")) return "react";
  return null;
}
function configureSetupFlags(rawArgs) {
  const rawFlags = new Set(rawArgs.filter((arg) => arg.startsWith("--")));
  return {
    isDryRun: rawFlags.has("--dry-run"),
    skipInstall: rawFlags.has("--skip-install"),
    isYes: rawFlags.has("--yes"),
    isJson: rawFlags.has("--json"),
    explicitProjectType: resolveExplicitProjectType(rawFlags)
  };
}
async function readPackageJson(cwd2) {
  return readJsonSafe(path2.join(cwd2, "package.json"));
}
async function detectPm(cwd2) {
  if (await pathExists2(path2.join(cwd2, "bun.lockb"))) return "bun";
  if (await pathExists2(path2.join(cwd2, "pnpm-lock.yaml"))) return "pnpm";
  if (await pathExists2(path2.join(cwd2, "yarn.lock"))) return "yarn";
  return "npm";
}
async function detectBundler(cwd2) {
  const pkg = await readPackageJson(cwd2);
  if (!pkg) return null;
  const deps = { ...pkg.dependencies ?? {}, ...pkg.devDependencies ?? {} };
  if (deps.next) return "next";
  if (deps.vite || deps["@vitejs/plugin-react"]) return "vite";
  if (deps["@rspack/core"] || deps.rspack) return "rspack";
  if (deps.react) return "react";
  return null;
}
async function alreadyInstalled(cwd2, pkgName) {
  const pkg = await readPackageJson(cwd2);
  if (!pkg) return false;
  const deps = { ...pkg.dependencies ?? {}, ...pkg.devDependencies ?? {} };
  return pkgName in deps;
}
async function findExisting(cwd2, names) {
  for (const name of names) {
    const resolved = path2.join(cwd2, name);
    if (await pathExists2(resolved)) return resolved;
  }
  return null;
}
async function writeFileWithDryRun(cwd2, filePath, content, label, flags, logger2) {
  if (flags.isDryRun) {
    logger2.dry(`create ${label}`);
    return;
  }
  await writeFileSafe(filePath, content);
  logger2.ok(path2.relative(cwd2, filePath) || label);
}
async function patchFileWithDryRun(filePath, patcher, label, flags, logger2) {
  const source = await readFileSafe(filePath);
  if (!source) return false;
  const patched = patcher(source);
  if (!patched) {
    logger2.skip(`${label} sudah terkonfigurasi`);
    return false;
  }
  if (flags.isDryRun) {
    logger2.dry(`patch ${label}`);
    return true;
  }
  await writeFileSafe(filePath, patched);
  logger2.ok(`${label} dipatch`);
  return true;
}
async function installPackages(cwd2, pm, pkgs, dev, flags, logger2) {
  if (flags.skipInstall) {
    logger2.skip("npm install (--skip-install)");
    return;
  }
  if (flags.isDryRun) {
    logger2.dry(`${pm} install ${pkgs.join(" ")}`);
    return;
  }
  const flag = dev ? pm === "yarn" || pm === "bun" ? "-D" : "--save-dev" : "--save";
  const cmd = pm === "yarn" ? ["add", flag, ...pkgs] : pm === "bun" ? ["add", flag, ...pkgs] : ["install", flag, ...pkgs];
  logger2.info(`$ ${pm} ${cmd.join(" ")}`);
  try {
    const exitCode = await runCommand(pm, cmd, {
      cwd: cwd2,
      allowNonZeroExit: true,
      stdio: flags.isJson ? "pipe" : "inherit"
    });
    if (exitCode !== 0) {
      logger2.warn(`install gagal - jalankan manual: ${pm} ${cmd.join(" ")}`);
    }
  } catch {
    logger2.warn(`install gagal - jalankan manual: ${pm} ${cmd.join(" ")}`);
  }
}

// packages/cli/src/utils/logger.ts
var import_picocolors2 = __toESM(require_picocolors());
function createCliLogger(options = {}) {
  function emit(level, prefix, message) {
    options.onEvent?.({ level, message });
    if (options.silent) return;
    const colorizedPrefix = level === "ok" ? import_picocolors2.default.green(prefix) : level === "warn" ? import_picocolors2.default.yellow(prefix) : level === "dry" ? import_picocolors2.default.cyan(prefix) : level === "skip" ? import_picocolors2.default.dim(prefix) : import_picocolors2.default.blue(prefix);
    if (options.output) {
      options.output.writeText(`${colorizedPrefix}${message}`, {
        stderr: options.useStderr
      });
      return;
    }
    const writeLine2 = options.useStderr ? console.error : console.log;
    writeLine2(`${prefix}${message}`);
  }
  return {
    ok(message) {
      emit("ok", "  [ok] ", message);
    },
    skip(message) {
      emit("skip", "  [skip] ", message);
    },
    warn(message) {
      emit("warn", "  [warn] ", message);
    },
    info(message) {
      emit("info", "       ", message);
    },
    dry(message) {
      emit("dry", "  [dry-run] ", message);
    }
  };
}

// packages/cli/src/setup.ts
init_output();
var cwd = process.cwd();
var setupFlags = {
  isDryRun: false,
  skipInstall: false,
  isYes: false,
  isJson: false,
  explicitProjectType: null
};
var PROJECT_OPTIONS = [
  { label: "Next.js", value: "next", adapter: "@tailwind-styled/next" },
  { label: "Vite", value: "vite", adapter: "@tailwind-styled/vite" },
  { label: "Rspack", value: "rspack", adapter: "@tailwind-styled/rspack" },
  { label: "React (other)", value: "react", adapter: "tailwind-styled-v4" }
];
function configureFlags(rawArgs) {
  setupFlags = configureSetupFlags(rawArgs);
}
async function pickProjectType(detected) {
  const log3 = setupFlags.isJson ? console.error : console.log;
  return pickProjectTypeInteractive(detected, setupFlags, PROJECT_OPTIONS, {
    log: log3,
    output: setupFlags.isJson ? process.stderr : process.stdout
  });
}
function patchNextConfig(src) {
  return patchNextConfigImpl(src);
}
function patchViteConfig(src) {
  return patchViteConfigImpl(src);
}
function patchRspackConfig(src) {
  return patchRspackConfigImpl(src);
}
function patchTailwindCss(src) {
  return patchTailwindCssImpl(src);
}
function patchTsConfig(src) {
  return patchTsConfigImpl(src);
}
async function runSetupCli(rawArgs) {
  configureFlags(rawArgs);
  const output = createCliOutput({
    json: setupFlags.isJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const events = [];
  const logger2 = createCliLogger({
    useStderr: setupFlags.isJson,
    output,
    onEvent(event) {
      events.push(event);
    }
  });
  output.writeText("\n+-----------------------------------------+");
  output.writeText("|  tailwind-styled-v4  ->  tw setup      |");
  output.writeText("+-----------------------------------------+\n");
  const bootSpinner = output.spinner();
  bootSpinner.start("Inspecting workspace");
  const [detected, pm] = await Promise.all([detectBundler(cwd), detectPm(cwd)]);
  bootSpinner.stop("Workspace inspected");
  if (detected) {
    const label = PROJECT_OPTIONS.find((option) => option.value === detected)?.label ?? detected;
    output.writeText(`  Terdeteksi: ${label}`);
  } else {
    output.writeText("  Project type tidak terdeteksi dari package.json.");
  }
  output.writeText("");
  const bundler = await pickProjectType(detected);
  output.writeText(`  PM      : ${pm}`);
  if (setupFlags.isDryRun) output.writeText("  Mode    : dry-run");
  output.writeText("");
  output.writeText(">> [1/5] Install packages");
  const adapterPkg = PROJECT_OPTIONS.find((option) => option.value === bundler)?.adapter ?? "tailwind-styled-v4";
  const [hasCorePkg, hasMergePkg, hasAdapterPkg] = await Promise.all([
    alreadyInstalled(cwd, "tailwind-styled-v4"),
    alreadyInstalled(cwd, "tailwind-merge"),
    alreadyInstalled(cwd, adapterPkg)
  ]);
  const toInstall = [!hasCorePkg && "tailwind-styled-v4", !hasMergePkg && "tailwind-merge"].filter(
    Boolean
  );
  const toInstallDev = [!hasAdapterPkg && adapterPkg].filter(Boolean);
  if (toInstall.length > 0) await installPackages(cwd, pm, toInstall, false, setupFlags, logger2);
  else logger2.skip("tailwind-styled-v4 + tailwind-merge sudah terpasang");
  if (toInstallDev.length > 0)
    await installPackages(cwd, pm, toInstallDev, true, setupFlags, logger2);
  else logger2.skip(`${adapterPkg} sudah terpasang`);
  output.writeText("\n>> [2/5] Patch bundler config");
  if (bundler === "next") {
    const cfg = await findExisting(cwd, ["next.config.ts", "next.config.mjs", "next.config.js"]);
    if (cfg) await patchFileWithDryRun(cfg, patchNextConfig, path2.basename(cfg), setupFlags, logger2);
    else
      logger2.warn("next.config.ts tidak ditemukan - jalankan npx create-next-app terlebih dahulu");
  } else if (bundler === "vite") {
    const cfg = await findExisting(cwd, ["vite.config.ts", "vite.config.mjs", "vite.config.js"]);
    if (cfg) await patchFileWithDryRun(cfg, patchViteConfig, path2.basename(cfg), setupFlags, logger2);
    else logger2.warn("vite.config.ts tidak ditemukan - jalankan npm create vite terlebih dahulu");
  } else if (bundler === "rspack") {
    const cfg = await findExisting(cwd, [
      "rspack.config.ts",
      "rspack.config.mjs",
      "rspack.config.js"
    ]);
    if (cfg)
      await patchFileWithDryRun(cfg, patchRspackConfig, path2.basename(cfg), setupFlags, logger2);
    else logger2.warn("rspack.config.ts tidak ditemukan - tambahkan manual");
  } else {
    logger2.skip("React tanpa bundler - tidak ada bundler config yang di-patch");
    logger2.info("Tambahkan tailwind-styled-v4 langsung ke komponen React kamu");
  }
  output.writeText("\n>> [3/5] tailwind-styled.config.json");
  const twsCfgPath = path2.join(cwd, "tailwind-styled.config.json");
  if (await findExisting(cwd, ["tailwind-styled.config.json"])) {
    logger2.skip("tailwind-styled.config.json sudah ada");
  } else {
    await writeFileWithDryRun(
      cwd,
      twsCfgPath,
      `${JSON.stringify(
        {
          version: 1,
          compiler: { engine: "rust" },
          css: { entry: "src/tailwind.css" }
        },
        null,
        2
      )}
`,
      "tailwind-styled.config.json",
      setupFlags,
      logger2
    );
  }
  output.writeText("\n>> [4/5] Tailwind CSS (@import)");
  const cssFile = await findExisting(cwd, [
    "src/app/globals.css",
    "src/globals.css",
    "src/styles/globals.css",
    "src/tailwind.css",
    "src/index.css",
    "styles/globals.css"
  ]);
  if (cssFile) {
    await patchFileWithDryRun(
      cssFile,
      patchTailwindCss,
      path2.relative(cwd, cssFile),
      setupFlags,
      logger2
    );
  } else {
    await writeFileWithDryRun(
      cwd,
      path2.join(cwd, "src/tailwind.css"),
      '@import "tailwindcss";\n',
      "src/tailwind.css",
      setupFlags,
      logger2
    );
    logger2.info("Import ke entry file: import './tailwind.css'");
  }
  output.writeText("\n>> [5/5] tsconfig.json");
  const tsCfg = path2.join(cwd, "tsconfig.json");
  if (await findExisting(cwd, ["tsconfig.json"])) {
    await patchFileWithDryRun(tsCfg, patchTsConfig, "tsconfig.json", setupFlags, logger2);
  } else {
    await writeFileWithDryRun(
      cwd,
      tsCfg,
      `${JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            lib: ["DOM", "DOM.Iterable", "ESNext"],
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            jsx: "react-jsx",
            esModuleInterop: true,
            skipLibCheck: true
          },
          include: ["src"],
          exclude: ["node_modules", "dist"]
        },
        null,
        2
      )}
`,
      "tsconfig.json",
      setupFlags,
      logger2
    );
  }
  output.writeText("\n+-----------------------------------------+");
  output.writeText("|  Setup selesai!                        |");
  output.writeText("+-----------------------------------------+\n");
  output.writeText("  Langkah selanjutnya:");
  output.writeText("    npx tw preflight   <- verifikasi semua config benar");
  output.writeText("    npm run dev        <- mulai development\n");
  if (setupFlags.isJson) {
    const report = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      cwd,
      detected,
      selected: bundler,
      packageManager: pm,
      dryRun: setupFlags.isDryRun,
      skipInstall: setupFlags.skipInstall,
      events,
      warnings: events.filter((event) => event.level === "warn").length
    };
    output.jsonSuccess("setup", report);
  }
}
init_errors();
init_fs();
init_output();
function estimateClassBytes(className) {
  const base = 20;
  if (className.startsWith("bg-")) return base + 28;
  if (className.startsWith("text-")) return base + 22;
  if (className.startsWith("border-")) return base + 20;
  if (className.startsWith("p-") || className.startsWith("px-") || className.startsWith("py-"))
    return base + 18;
  if (className.startsWith("m-") || className.startsWith("mx-") || className.startsWith("my-"))
    return base + 18;
  if (className.startsWith("w-") || className.startsWith("h-")) return base + 12;
  if (className.startsWith("flex")) return base + 16;
  if (className.startsWith("grid")) return base + 20;
  if (className.startsWith("rounded")) return base + 18;
  if (className.startsWith("shadow")) return base + 24;
  if (className.startsWith("hover:") || className.startsWith("focus:")) return base + 35;
  return base + 15;
}
async function runStatsCli(args) {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false }
    }
  });
  const jsonFlag = Boolean(parsed.values.json);
  const output = createCliOutput({
    json: jsonFlag,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1"
  });
  const dirArg = parsed.positionals[0] ?? ".";
  const dir = path2.resolve(process.cwd(), dirArg);
  if (!await pathExists2(dir)) {
    throw new CliUsageError(`Directory not found: ${dir}`);
  }
  const analyzer = await loadAnalyzerModule();
  const spinner = output.spinner();
  spinner.start(`Computing stats for ${dir}`);
  const report = await analyzer.analyzeWorkspace(dir, {
    classStats: { top: 30, frequentThreshold: 2 }
  });
  spinner.stop(`Stats complete: ${report.totalFiles} file(s)`);
  const totalBytes = report.safelist.reduce(
    (sum, className) => sum + estimateClassBytes(className),
    0
  );
  const duplicateBytes = report.classStats.frequent.reduce(
    (sum, usage) => sum + estimateClassBytes(usage.name) * Math.max(usage.count - 1, 0),
    0
  );
  if (jsonFlag) {
    output.jsonSuccess("stats", { ...report, estimatedCssBytes: totalBytes, duplicateBytes });
    return;
  }
  const bar = "-".repeat(55);
  output.writeText(`
+${bar}+`);
  output.writeText(`|  tailwind-styled-v4 - Bundle Stats${" ".repeat(20)}|`);
  output.writeText(`+${bar}+`);
  output.writeText(`|  Files scanned:     ${String(report.totalFiles).padEnd(34)}|`);
  output.writeText(`|  Unique classes:    ${String(report.uniqueClassCount).padEnd(34)}|`);
  output.writeText(
    `|  Est. CSS size:     ${String((totalBytes / 1024).toFixed(1) + " kB").padEnd(34)}|`
  );
  output.writeText(
    `|  Duplicate waste:   ${String((duplicateBytes / 1024).toFixed(1) + " kB").padEnd(34)}|`
  );
  output.writeText(`+${bar}+`);
  if (report.classStats.top.length > 0) {
    output.writeText("\n  TOP CLASSES BY CSS WEIGHT");
    output.writeText(`  ${"-".repeat(52)}`);
    const sorted = [...report.classStats.top].map((usage) => ({ ...usage, bytes: estimateClassBytes(usage.name) * usage.count })).sort((left, right) => right.bytes - left.bytes);
    for (const usage of sorted.slice(0, 10)) {
      output.writeText(
        `  ${usage.name.padEnd(32)} ${String(usage.count + "x").padEnd(6)} ~${(usage.bytes / 1024).toFixed(1)}kB`
      );
    }
  }
  output.writeText("");
}

// packages/cli/src/utils/traceService.ts
init_src3();
init_src2();

// packages/engine/src/bundleAnalyzer.ts
var BundleAnalyzer = class {
  constructor() {
    this.classUsages = /* @__PURE__ */ new Map();
    this.classCounts = /* @__PURE__ */ new Map();
  }
  analyzeClass(className, scanResult, css) {
    if (!className || className.trim() === "") {
      throw new Error("Class name cannot be empty");
    }
    if (!scanResult) {
      throw new Error("Scan result is required for analysis");
    }
    if (typeof css !== "string") {
      throw new Error("CSS string is required for analysis");
    }
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const usageCount = this.countClassUsage(normalizedClass, scanResult);
    const files = this.getFilesUsingClass(normalizedClass, scanResult);
    const bundleSize = this.calculateBundleContribution(normalizedClass, css);
    const variantChains = this.extractVariantChains(normalizedClass, css);
    const dependencies = this.extractDependencies(normalizedClass, css);
    const isDeadCode = this.checkIsDeadCode(normalizedClass, scanResult, css);
    return {
      className: normalizedClass,
      totalUsage: usageCount,
      files,
      bundleSizeBytes: bundleSize,
      variantChains,
      isDeadCode,
      dependencies
    };
  }
  analyzeAll(scanResult, css) {
    if (!scanResult) {
      throw new Error("Scan result is required for analysis");
    }
    if (typeof css !== "string") {
      throw new Error("CSS string is required for analysis");
    }
    const results = /* @__PURE__ */ new Map();
    const allClasses = new Set(scanResult.uniqueClasses);
    const cssClasses = this.extractClassesFromCss(css);
    for (const cssClass of cssClasses) {
      allClasses.add(cssClass);
    }
    for (const className of allClasses) {
      try {
        const result = this.analyzeClass(className, scanResult, css);
        results.set(className, result);
      } catch (error) {
        console.warn(`Failed to analyze class "${className}":`, error);
      }
    }
    return results;
  }
  calculateBundleContribution(className, css) {
    if (!className || className.trim() === "") {
      throw new Error("Class name cannot be empty");
    }
    if (typeof css !== "string") {
      throw new Error("CSS string is required");
    }
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const escapedClass = normalizedClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const selectorPattern = new RegExp(`\\.${escapedClass}([\\s:{]|$)`, "g");
    const matches = css.match(selectorPattern);
    if (!matches) {
      return 0;
    }
    let totalSize = 0;
    const classSelector = `.${normalizedClass}`;
    const lines = css.split("\n");
    for (const line of lines) {
      if (line.includes(classSelector)) {
        const declarationStart = line.indexOf("{");
        if (declarationStart !== -1) {
          const declaration = line.substring(declarationStart);
          totalSize += declaration.length + 1;
        }
      }
    }
    return totalSize;
  }
  detectDeadCode(scanResult, css) {
    if (!scanResult) {
      throw new Error("Scan result is required for dead code detection");
    }
    if (typeof css !== "string") {
      throw new Error("CSS string is required for dead code detection");
    }
    const cssClasses = this.extractClassesFromCss(css);
    const usedClasses = new Set(scanResult.uniqueClasses);
    const deadCode = [];
    for (const cssClass of cssClasses) {
      if (!usedClasses.has(cssClass)) {
        deadCode.push(cssClass);
      }
    }
    for (const file of scanResult.files) {
      for (const usedClass of file.classes) {
        if (!cssClasses.includes(usedClass)) {
          if (!usedClasses.has(usedClass)) {
            usedClasses.add(usedClass);
          }
        }
      }
    }
    return deadCode;
  }
  countClassUsage(className, scanResult) {
    let count = 0;
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    for (const file of scanResult.files) {
      for (const fileClass of file.classes) {
        const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass;
        if (normalizedFileClass === normalizedClass) {
          count++;
        }
      }
    }
    return count;
  }
  getFilesUsingClass(className, scanResult) {
    const files = [];
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    for (const file of scanResult.files) {
      for (const fileClass of file.classes) {
        const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass;
        if (normalizedFileClass === normalizedClass) {
          files.push({
            file: file.file,
            line: 1,
            column: 1
          });
          break;
        }
      }
    }
    return files;
  }
  extractVariantChains(className, css) {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const variantChains = [];
    const escapedClass = normalizedClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const variantPattern = new RegExp(`([\\w-]+:${escapedClass}|${escapedClass})`, "g");
    const lines = css.split("\n");
    for (const line of lines) {
      const matches = line.match(variantPattern);
      if (matches) {
        for (const match of matches) {
          if (match.includes(":")) {
            variantChains.push(match);
          }
        }
      }
    }
    return [...new Set(variantChains)];
  }
  extractDependencies(className, css) {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const dependencies = [];
    const parts = normalizedClass.split(":");
    for (let i = 0; i < parts.length - 1; i++) {
      dependencies.push(parts.slice(0, i + 1).join(":"));
    }
    return dependencies;
  }
  checkIsDeadCode(className, scanResult, css) {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const cssClasses = this.extractClassesFromCss(css);
    if (!cssClasses.includes(normalizedClass)) {
      return true;
    }
    const usageCount = this.countClassUsage(normalizedClass, scanResult);
    return usageCount === 0;
  }
  extractClassesFromCss(css) {
    const classes = [];
    const classPattern = /\.([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)*)/g;
    let match;
    while ((match = classPattern.exec(css)) !== null) {
      const className = match[1];
      if (!classes.includes(className)) {
        classes.push(className);
      }
    }
    return classes;
  }
};

// packages/engine/src/impactTracker.ts
var ImpactTracker = class {
  constructor() {
    this.criticalPatterns = [
      "fixed",
      "absolute",
      "sticky",
      "z-50",
      "z-index",
      "top-0",
      "right-0",
      "bottom-0",
      "left-0",
      "w-full",
      "h-full",
      "min-h-screen",
      "flex",
      "grid",
      "block",
      "inline",
      "hidden",
      "visible",
      "opacity",
      "pointer-events",
      "cursor"
    ];
    this.bundleAnalyzer = new BundleAnalyzer();
  }
  calculateImpact(className, bundleAnalysis, scanResult) {
    if (!className || className.trim() === "") {
      return this.createEmptyReport(className);
    }
    if (!bundleAnalysis) {
      return this.createEmptyReport(className);
    }
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const affectedComponents = this.findAffectedComponents(normalizedClass, scanResult);
    const directUsage = affectedComponents.filter((c) => c.usageType === "direct").length;
    const indirectUsage = affectedComponents.filter((c) => c.usageType !== "direct").length;
    const totalComponents = affectedComponents.length;
    const bundleSizeBytes = bundleAnalysis.bundleSizeBytes || 0;
    const estimatedSavings = this.calculateSavings(bundleSizeBytes, totalComponents);
    const impactReport = {
      className: normalizedClass,
      totalComponents,
      directUsage,
      indirectUsage,
      bundleSizeBytes,
      estimatedSavings,
      riskLevel: "low",
      suggestions: []
    };
    impactReport.riskLevel = this.calculateRisk(normalizedClass, impactReport);
    impactReport.suggestions = this.generateSuggestions(normalizedClass, impactReport);
    return impactReport;
  }
  findAffectedComponents(className, scanResult) {
    const components = [];
    if (!className || className.trim() === "") {
      return components;
    }
    if (!scanResult || !scanResult.files) {
      return components;
    }
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    const classParts = normalizedClass.split(":");
    for (const file of scanResult.files) {
      if (!file || !file.file) continue;
      const filePath = file.file;
      const classes = file.classes || [];
      const variants = file.variants || [];
      for (let i = 0; i < classes.length; i++) {
        const fileClass = classes[i];
        if (!fileClass) continue;
        const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass;
        if (normalizedFileClass === normalizedClass) {
          components.push({
            file: filePath,
            line: file.lineNumbers?.[i] || 1,
            column: file.columnNumbers?.[i] || 1,
            usageType: "direct"
          });
        } else if (normalizedFileClass.includes(normalizedClass)) {
          const variant = classParts.length > 1 ? classParts[0] : void 0;
          components.push({
            file: filePath,
            line: file.lineNumbers?.[i] || 1,
            column: file.columnNumbers?.[i] || 1,
            usageType: "variant",
            variant
          });
        }
      }
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant) continue;
        if (variant.includes(normalizedClass)) {
          const baseClass = variant.split(":").pop();
          if (baseClass === normalizedClass) {
            components.push({
              file: filePath,
              line: file.lineNumbers?.[i] || 1,
              column: file.columnNumbers?.[i] || 1,
              usageType: "variant",
              variant: variant.split(":")[0]
            });
          }
        }
      }
    }
    return components;
  }
  calculateRisk(className, impact) {
    if (!className || className.trim() === "") {
      return "low";
    }
    if (!impact) {
      return "low";
    }
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    if (impact.totalComponents > 10) {
      return "high";
    }
    if (this.isCriticalClass(normalizedClass)) {
      return "high";
    }
    if (impact.totalComponents >= 5 && impact.totalComponents <= 10) {
      return "medium";
    }
    return "low";
  }
  generateSuggestions(className, impact) {
    const suggestions = [];
    if (!className || className.trim() === "") {
      return suggestions;
    }
    if (!impact) {
      return suggestions;
    }
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className;
    if (impact.riskLevel === "high") {
      if (impact.totalComponents > 10) {
        suggestions.push(
          `This class is used in ${impact.totalComponents} components. Consider creating a utility component instead.`
        );
      }
      if (this.isCriticalClass(normalizedClass)) {
        suggestions.push(
          "This is a critical positioning/display class. Review all usages before removal."
        );
      }
      suggestions.push("Manual code review recommended before removing this class.");
    } else if (impact.riskLevel === "medium") {
      suggestions.push(
        `This class is used in ${impact.totalComponents} components. Test each component after removal.`
      );
      if (impact.indirectUsage > 0) {
        suggestions.push("Check for indirect usages via variants before removing.");
      }
    } else {
      if (impact.totalComponents > 0) {
        suggestions.push("Low risk: class is used in fewer than 5 components.");
      } else {
        suggestions.push("This class appears to be unused. Consider removing it.");
      }
    }
    if (impact.estimatedSavings > 0) {
      suggestions.push(`Estimated bundle size savings: ~${impact.estimatedSavings} bytes.`);
    }
    if (impact.bundleSizeBytes > 100) {
      suggestions.push(
        "This class has significant CSS bundle contribution. Removal will improve load times."
      );
    }
    return suggestions;
  }
  isCriticalClass(className) {
    const normalized = className.startsWith(".") ? className.slice(1) : className;
    return this.criticalPatterns.some(
      (pattern) => normalized === pattern || normalized.startsWith(pattern + ":")
    );
  }
  calculateSavings(bundleSize, componentCount) {
    const baseSavings = bundleSize;
    const componentOverhead = componentCount * 50;
    return Math.max(0, baseSavings - componentOverhead);
  }
  createEmptyReport(className) {
    const normalizedClass = className?.startsWith(".") ? className.slice(1) : className || "";
    return {
      className: normalizedClass,
      totalComponents: 0,
      directUsage: 0,
      indirectUsage: 0,
      bundleSizeBytes: 0,
      estimatedSavings: 0,
      riskLevel: "low",
      suggestions: ["Invalid class name or analysis data."]
    };
  }
};

// packages/engine/src/reverseLookup.ts
var ReverseLookup = class {
  constructor() {
    this.parsedCache = /* @__PURE__ */ new Map();
  }
  parseCSS(css) {
    const cached = this.parsedCache.get(css);
    if (cached) {
      return cached;
    }
    const rules = [];
    const classMap = /* @__PURE__ */ new Map();
    const selectorRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
    const importantRegex = /!important\s*;?\s*$/;
    let match;
    const lines = css.split("\n");
    let columnOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineEnd = columnOffset + line.length + 1;
      while ((match = selectorRegex.exec(line)) !== null) {
        const className = match[1];
        const selectorStart = match.index;
        const lineColumn = selectorStart + 1;
        if (!classMap.has(className)) {
          classMap.set(className, /* @__PURE__ */ new Map());
        }
        const braceMatch = css.indexOf("{", lineEnd - 1);
        if (braceMatch !== -1) {
          const closingBraceMatch = this.findClosingBrace(css, braceMatch);
          const ruleContent = css.substring(braceMatch + 1, closingBraceMatch);
          const variants = [];
          const variantMatch = className.match(/^(.+?)(?::([a-zA-Z0-9_-]+))?$/);
          if (variantMatch && variantMatch[2]) {
            variants.push(variantMatch[2]);
          }
          const specificity = this.calculateSpecificity(className);
          const source = {
            file: "inline",
            line: i + 1,
            column: lineColumn
          };
          let propMatch;
          const propRegex = /([a-zA-Z-]+)\s*:\s*([^;]+)/g;
          let propContent = ruleContent;
          while ((propMatch = propRegex.exec(propContent)) !== null) {
            const property = propMatch[1].trim();
            let value = propMatch[2].trim();
            const isImportant = importantRegex.test(value);
            if (isImportant) {
              value = value.replace(importantRegex, "").trim();
            }
            const rule = {
              className,
              property,
              value,
              specificity,
              source,
              isImportant,
              variants,
              isOverride: false
            };
            rules.push(rule);
            const classRules = classMap.get(className);
            const existingProp = classRules.get(property);
            if (existingProp) {
              rule.isOverride = true;
            }
            classRules.set(property, rule);
          }
        }
        selectorRegex.lastIndex = lineEnd - 1;
      }
      columnOffset = lineEnd;
    }
    this.parsedCache.set(css, rules);
    return rules;
  }
  findClosingBrace(css, start) {
    let depth = 1;
    for (let i = start + 1; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
    return start;
  }
  calculateSpecificity(className) {
    let specificity = 1;
    const pseudoClasses = className.match(/:[a-zA-Z-]+/g) || [];
    specificity += pseudoClasses.length * 10;
    const attributes = className.match(/\[[^\]]+\]/g) || [];
    specificity += attributes.length * 10;
    const pseudoElements = className.match(/::[a-zA-Z-]+/g) || [];
    specificity += pseudoElements.length * 100;
    return specificity;
  }
  fromCSS(cssProperty, cssValue, css) {
    if (!css || !cssProperty) {
      return [];
    }
    const rules = this.parseCSS(css);
    const normalizedProperty = cssProperty.toLowerCase();
    const normalizedValue = cssValue.toLowerCase().trim();
    const propertyMap = /* @__PURE__ */ new Map();
    for (const rule of rules) {
      if (rule.property.toLowerCase() !== normalizedProperty) {
        continue;
      }
      const ruleValueLower = rule.value.toLowerCase().trim();
      if (ruleValueLower !== normalizedValue && !ruleValueLower.includes(normalizedValue)) {
        continue;
      }
      const existingClass = propertyMap.get(rule.property) || [];
      const classUsage = {
        className: rule.className,
        source: rule.source,
        specificity: rule.specificity,
        isOverride: rule.isOverride || false,
        variants: rule.variants
      };
      existingClass.push(classUsage);
      propertyMap.set(rule.property, existingClass);
    }
    const results = [];
    for (const [property, usages] of propertyMap) {
      results.push({
        property,
        value: cssValue,
        usedInClasses: usages
      });
    }
    return results;
  }
  fromBundle(className, css) {
    if (!css || !className) {
      return [];
    }
    const rules = this.parseCSS(css);
    const results = [];
    for (const rule of rules) {
      if (rule.className === className || rule.className.startsWith(className + ":")) {
        const ruleIR = {
          id: { value: results.length },
          selector: { value: 0 },
          variantChain: { value: 0 },
          property: { value: 0 },
          value: { value: 0 },
          origin: 2,
          importance: rule.isImportant ? 1 : 0,
          layer: null,
          layerOrder: 0,
          specificity: rule.specificity,
          condition: null,
          conditionResult: 0,
          insertionOrder: results.length,
          fingerprint: "",
          source: rule.source
        };
        results.push(ruleIR);
      }
    }
    return results;
  }
  findDependents(className, css) {
    if (!css || !className) {
      return [];
    }
    const rules = this.parseCSS(css);
    const dependents = /* @__PURE__ */ new Set();
    const classParts = className.split(":");
    const baseClass = classParts[0];
    for (const rule of rules) {
      const ruleBaseClass = rule.className.split(":")[0];
      if (ruleBaseClass === baseClass && rule.className !== className) {
        dependents.add(rule.className);
      }
      if (rule.className.includes(baseClass) && rule.className !== className) {
        const isVariant = rule.className.includes(":");
        if (isVariant && !rule.className.startsWith(className + ":")) {
          dependents.add(rule.className);
        }
      }
    }
    return Array.from(dependents);
  }
  findByProperty(property, css) {
    if (!css || !property) {
      return [];
    }
    const rules = this.parseCSS(css);
    const normalizedProperty = property.toLowerCase();
    const propertyMap = /* @__PURE__ */ new Map();
    for (const rule of rules) {
      if (rule.property.toLowerCase() !== normalizedProperty) {
        continue;
      }
      if (!propertyMap.has(rule.property)) {
        propertyMap.set(rule.property, /* @__PURE__ */ new Map());
      }
      const propMap = propertyMap.get(rule.property);
      if (!propMap.has(rule.value)) {
        const classUsage = {
          className: rule.className,
          source: rule.source,
          specificity: rule.specificity,
          isOverride: rule.isOverride || false,
          variants: rule.variants
        };
        propMap.set(rule.value, classUsage);
      }
    }
    const results = [];
    for (const [prop, valueMap] of propertyMap) {
      for (const [value, usage] of valueMap) {
        const existing = results.find((r) => r.property === prop && r.value === value);
        if (existing) {
          existing.usedInClasses.push(usage);
        } else {
          results.push({
            property: prop,
            value,
            usedInClasses: [usage]
          });
        }
      }
    }
    return results;
  }
};

// packages/engine/src/ir.ts
var RuleId = class {
  constructor(value) {
    this.value = value;
  }
};
var PropertyId = class {
  constructor(value) {
    this.value = value;
  }
};
var ValueId = class {
  constructor(value) {
    this.value = value;
  }
};
var LayerId = class {
  constructor(value) {
    this.value = value;
  }
};
var ConditionId = class {
  constructor(value) {
    this.value = value;
  }
};
function createFingerprint(parts) {
  let hash = 0;
  for (const part of parts) {
    const str = part;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
  }
  return Math.abs(hash).toString(36);
}

// packages/cli/src/utils/traceService.ts
var ruleIdCounter = 0;
var selectorIdCounter = 0;
var propertyIdCounter = 0;
var valueIdCounter = 0;
var layerIdCounter = 0;
var conditionIdCounter = 0;
var insertionOrderCounter = 0;
function generateRuleId() {
  return new RuleId(ruleIdCounter++);
}
function generateSelectorId() {
  return new RuleId(selectorIdCounter++);
}
function generatePropertyId() {
  return new PropertyId(propertyIdCounter++);
}
function generateValueId() {
  return new ValueId(valueIdCounter++);
}
function generateLayerId() {
  return new LayerId(layerIdCounter++);
}
function generateConditionId() {
  return new ConditionId(conditionIdCounter++);
}
function getNextInsertionOrder() {
  return insertionOrderCounter++;
}
var layerMap = /* @__PURE__ */ new Map();
var layerOrderMap = /* @__PURE__ */ new Map();
var LAYER_ORDER = {
  base: 0,
  components: 1,
  utilities: 2,
  tailwind: 3
};
function getOrCreateLayerId(layerName) {
  const existing = layerMap.get(layerName);
  if (existing) return existing;
  const order = LAYER_ORDER[layerName] ?? 4;
  const layerId = generateLayerId();
  layerMap.set(layerName, layerId);
  layerOrderMap.set(layerName, order);
  return layerId;
}
function calculateSpecificity(selector) {
  let specificity = 0;
  specificity += selector.className.split(":").length * 10;
  for (const pseudo of selector.pseudoClasses) {
    specificity += 10;
  }
  if (selector.mediaQuery) {
    specificity += 1e3;
  }
  return specificity;
}
function parseSelector(selectorText) {
  let baseClass = selectorText;
  let mediaQuery = null;
  const mediaMatch = selectorText.match(/^@media[^{]+\{(.+)$/);
  if (mediaMatch) {
    mediaQuery = mediaMatch[0];
    baseClass = mediaMatch[1].trim();
  }
  if (baseClass.startsWith(".")) {
    baseClass = baseClass.slice(1);
  }
  const escapedColon = /\\:/g;
  baseClass = baseClass.replace(escapedColon, "\0");
  const parts = baseClass.split(":");
  baseClass = parts[0].replace(/\x00/g, ":");
  const variants = [];
  const pseudoClasses = [];
  const variantRegex = /^(hover|focus|active|visited|checked|disabled|required|optional|first|last|odd|even|before|after|placeholder|file|selection|backdrop|group|peer)/i;
  const pseudoRegex = /^:([a-zA-Z-]+)$/;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (variantRegex.test(part)) {
      variants.push(part);
    } else if (pseudoRegex.test(":" + part)) {
      pseudoClasses.push(":" + part);
    } else {
      variants.push(part);
    }
  }
  return {
    className: baseClass,
    variants,
    pseudoClasses,
    mediaQuery
  };
}
function parseDeclaration(block) {
  const declarations = [];
  const propertyRegex = /([a-zA-Z-]+)\s*:\s*([^;!]+)(!important)?/g;
  let match;
  while ((match = propertyRegex.exec(block)) !== null) {
    const property = match[1].trim();
    const value = match[2].trim();
    const important = match[3] !== void 0;
    declarations.push({ property, value, important });
  }
  return declarations;
}
function parseRules(css) {
  const rules = [];
  const ruleRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selectorText = match[1].trim();
    const declarationBlock = match[2].trim();
    if (selectorText.startsWith("@")) {
      continue;
    }
    const parsedSelector = parseSelector(selectorText);
    const declarations = parseDeclaration(declarationBlock);
    for (const decl of declarations) {
      rules.push({
        selector: parsedSelector,
        property: decl.property,
        value: decl.value,
        important: decl.important
      });
    }
  }
  return rules;
}
function detectLayerFromSelector(className) {
  const layerPrefixes = ["tw-", "tailwind-"];
  for (const prefix of layerPrefixes) {
    if (className.startsWith(prefix)) {
      return "tailwind";
    }
  }
  return null;
}
function parseCssToIr(css, prefix = "") {
  ruleIdCounter = 0;
  selectorIdCounter = 0;
  propertyIdCounter = 0;
  valueIdCounter = 0;
  layerIdCounter = 0;
  conditionIdCounter = 0;
  insertionOrderCounter = 0;
  layerMap.clear();
  layerOrderMap.clear();
  const rules = [];
  const classToRuleIds = /* @__PURE__ */ new Map();
  const parsedRules = parseRules(css);
  for (const parsedRule of parsedRules) {
    const className = prefix + parsedRule.selector.className;
    const specificity = calculateSpecificity(parsedRule.selector);
    const layerName = detectLayerFromSelector(className);
    const layer = layerName ? getOrCreateLayerId(layerName) : null;
    const layerOrder = layerName ? layerOrderMap.get(layerName) ?? 4 : 4;
    const selectorId = generateSelectorId();
    const propertyId = generatePropertyId();
    const valueId = generateValueId();
    let conditionId = null;
    let conditionResult = 2 /* Unknown */;
    if (parsedRule.selector.mediaQuery) {
      conditionId = generateConditionId();
      conditionResult = 2 /* Unknown */;
    }
    const fingerprint = createFingerprint([className, parsedRule.property, parsedRule.value]);
    const ruleId = generateRuleId();
    const rule = {
      id: ruleId,
      selector: selectorId,
      variantChain: { value: 0 },
      property: propertyId,
      value: valueId,
      origin: 2 /* AuthorNormal */,
      importance: parsedRule.important ? 1 /* Important */ : 0 /* Normal */,
      layer,
      layerOrder,
      specificity,
      condition: conditionId,
      conditionResult,
      insertionOrder: getNextInsertionOrder(),
      fingerprint,
      source: {
        file: "",
        line: 1,
        column: 1
      }
    };
    rules.push(rule);
    const existingRuleIds = classToRuleIds.get(className) || [];
    existingRuleIds.push(ruleId);
    classToRuleIds.set(className, existingRuleIds);
  }
  return { rules, classToRuleIds };
}
var CascadeResolver = class {
  constructor() {
    this.propertyBuckets = /* @__PURE__ */ new Map();
    this.rules = /* @__PURE__ */ new Map();
    this.resolutions = /* @__PURE__ */ new Map();
    this.classRules = /* @__PURE__ */ new Map();
  }
  addRule(rule) {
    this.rules.set(rule.id, rule);
    const property = rule.property;
    let bucket = this.propertyBuckets.get(property);
    if (!bucket) {
      bucket = {
        property,
        rules: []
      };
      this.propertyBuckets.set(property, bucket);
    }
    bucket.rules = [...bucket.rules, rule.id];
  }
  addRules(rules) {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }
  getRule(ruleId) {
    return this.rules.get(ruleId);
  }
  registerClass(className, ruleIds) {
    this.classRules.set(className, ruleIds);
  }
  getClassRules(className) {
    return this.classRules.get(className);
  }
  resolveByClassName(className) {
    const ruleIds = this.classRules.get(className);
    if (!ruleIds) {
      return null;
    }
    const classRules = [];
    for (const ruleId of ruleIds) {
      const rule = this.rules.get(ruleId);
      if (rule) {
        classRules.push(rule);
      }
    }
    const propertyMap = /* @__PURE__ */ new Map();
    for (const rule of classRules) {
      const existing = propertyMap.get(rule.property) || [];
      existing.push(rule);
      propertyMap.set(rule.property, existing);
    }
    const resolved = /* @__PURE__ */ new Map();
    for (const [property, rules] of propertyMap) {
      if (rules.length > 0) {
        const activeRules = rules.filter((r) => r.conditionResult !== 1 /* Inactive */);
        if (activeRules.length > 0) {
          activeRules.sort((a, b) => {
            const originDiff = b.origin - a.origin;
            if (originDiff !== 0) return originDiff;
            const layerDiff = b.layerOrder - a.layerOrder;
            if (layerDiff !== 0) return layerDiff;
            const importanceDiff = b.importance - a.importance;
            if (importanceDiff !== 0) return importanceDiff;
            const specificityDiff = b.specificity - a.specificity;
            if (specificityDiff !== 0) return specificityDiff;
            return b.insertionOrder - a.insertionOrder;
          });
          const winner = activeRules[0];
          resolved.set(property, { winner: winner.id });
        }
      }
    }
    return { resolvedProperties: resolved };
  }
};
function trace(className, resolver) {
  const provenance = {
    source: { file: "", line: 0, column: 0 },
    variants: /* @__PURE__ */ new Map(),
    rules: /* @__PURE__ */ new Map()
  };
  const classRuleIds = resolver.getClassRules(className);
  const allRules = [];
  if (classRuleIds) {
    for (const ruleId of classRuleIds) {
      const rule = resolver.getRule(ruleId);
      if (rule) {
        allRules.push(rule);
      }
    }
  }
  for (const rules of provenance.rules.values()) {
    allRules.push(...rules);
  }
  const rulesByProperty = /* @__PURE__ */ new Map();
  for (const rule of allRules) {
    const propKey = rule.property.toString();
    if (!rulesByProperty.has(propKey)) {
      rulesByProperty.set(propKey, []);
    }
    rulesByProperty.get(propKey).push(rule);
  }
  const ruleTraces = [];
  const conflictTraces = [];
  for (const [property, rules] of rulesByProperty) {
    if (rules.length === 0) continue;
    const activeRules = rules.filter((r) => r.conditionResult !== 1 /* Inactive */);
    if (activeRules.length === 0) continue;
    activeRules.sort((a, b) => {
      const originDiff = b.origin - a.origin;
      if (originDiff !== 0) return originDiff;
      const layerDiff = b.layerOrder - a.layerOrder;
      if (layerDiff !== 0) return layerDiff;
      const importanceDiff = b.importance - a.importance;
      if (importanceDiff !== 0) return importanceDiff;
      const specificityDiff = b.specificity - a.specificity;
      if (specificityDiff !== 0) return specificityDiff;
      return b.insertionOrder - a.insertionOrder;
    });
    const winnerRule = activeRules[0];
    const losers = activeRules.slice(1);
    ruleTraces.push({
      property,
      value: winnerRule.value.toString(),
      applied: true,
      reason: null,
      source: winnerRule.source,
      specificity: winnerRule.specificity
    });
    for (const loserRule of losers) {
      ruleTraces.push({
        property,
        value: loserRule.value.toString(),
        applied: false,
        reason: "lower specificity",
        source: loserRule.source,
        specificity: loserRule.specificity
      });
      conflictTraces.push({
        property,
        winner: winnerRule.value.toString(),
        loser: loserRule.value.toString(),
        stage: "Specificity",
        causes: ["lower specificity"]
      });
    }
  }
  const resolved = resolver.resolveByClassName(className);
  const finalStyle = [];
  if (resolved) {
    for (const [propId, resolution] of resolved.resolvedProperties) {
      const winnerRule = allRules.find((r) => r.id.value === resolution.winner.value);
      finalStyle.push({
        property: propId.toString(),
        value: winnerRule?.value.toString() ?? ""
      });
    }
  }
  return {
    class: className,
    definedAt: provenance.source,
    variants: Array.from(provenance.variants.values()),
    rules: ruleTraces,
    conflicts: conflictTraces,
    finalStyle
  };
}
async function traceClass(className, options) {
  const root = options?.root ?? process.cwd();
  const scanResult = await scanWorkspace(root, {
    includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
    useCache: false
  });
  if (!scanResult.uniqueClasses.includes(className)) {
    throw new Error(
      `Class "${className}" not found in workspace scan. Make sure the class is used in your source files.`
    );
  }
  let cssResult;
  try {
    cssResult = compileCssFromClasses([className], {});
  } catch (error) {
    throw new Error(
      `Failed to compile CSS for class "${className}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!cssResult.css || cssResult.css.trim() === "") {
    throw new Error(
      `Class "${className}" has no CSS rules. The class may not be a valid Tailwind class.`
    );
  }
  const { rules, classToRuleIds } = parseCssToIr(cssResult.css);
  const ruleIds = classToRuleIds.get(className);
  if (!ruleIds || ruleIds.length === 0) {
    throw new Error(`No rules found for class "${className}" after parsing CSS.`);
  }
  const resolver = new CascadeResolver();
  resolver.addRules(rules);
  resolver.registerClass(className, ruleIds);
  const engineTraceResult = trace(className, resolver);
  return convertTraceResult(engineTraceResult);
}
function convertTraceResult(engineResult) {
  return {
    class: engineResult.class,
    definedAt: {
      file: engineResult.definedAt.file,
      line: engineResult.definedAt.line,
      column: engineResult.definedAt.column
    },
    variants: engineResult.variants.map((v) => ({
      name: v.name,
      value: v.value,
      source: {
        file: v.source?.file ?? "",
        line: v.source?.line ?? 0
      }
    })),
    rules: engineResult.rules.map((r) => ({
      property: r.property,
      value: String(r.value),
      applied: r.applied,
      reason: r.reason,
      source: {
        file: r.source?.file ?? "",
        line: r.source?.line ?? 0
      },
      specificity: r.specificity
    })),
    conflicts: engineResult.conflicts.map((c) => ({
      property: c.property,
      winner: String(c.winner),
      loser: String(c.loser),
      stage: c.stage,
      causes: c.causes
    })),
    finalStyle: engineResult.finalStyle.map((f) => ({
      property: String(f.property),
      value: String(f.value)
    }))
  };
}

// packages/cli/src/commands/trace.ts
var nodeRequire = createRequire(process.cwd() + "/noop.cjs");
async function runTraceCli(args, context) {
  const className = args[0];
  if (!className) {
    context.output.error("Usage: tw trace <class-name>");
    context.output.info("Example: tw trace btn-primary");
    return;
  }
  try {
    const engine = nodeRequire("@tailwind-styled/engine");
    const traceResult = await performTrace(className, context);
    if (context.json) {
      context.output.jsonSuccess("trace", traceResult);
    } else {
      printTraceOutput(traceResult, context.output);
    }
  } catch (error) {
    context.output.error(`Failed to trace class: ${error}`);
  }
}
async function performTrace(className, context) {
  return await traceClass(className, { root: context.cwd });
}
function printTraceOutput(result, output) {
  const { class: className, definedAt, variants, rules, conflicts, finalStyle } = result;
  output.step(`Trace: ${className}`);
  output.info(`defined in: ${definedAt.file}:${definedAt.line}`);
  if (variants.length > 0) {
    output.success("Variants:");
    for (const variant of variants) {
      output.writeText(
        `  ${variant.name}: ${variant.value} (${variant.source.file}:${variant.source.line})`
      );
    }
  }
  output.success("Rules:");
  for (const rule of rules) {
    const status = rule.applied ? "\u2713" : "\u2717";
    const reason = rule.reason ? ` (${rule.reason})` : "";
    output.writeText(`  ${rule.property}: ${rule.value} ${status}${reason}`);
  }
  if (conflicts.length > 0) {
    output.warn("Conflicts:");
    for (const conflict of conflicts) {
      output.writeText(
        `  ${conflict.property}: ${conflict.winner} overrides ${conflict.loser} (${conflict.stage})`
      );
    }
  }
  output.success("Final Style:");
  for (const style of finalStyle) {
    output.writeText(`  ${style.property}: ${style.value}`);
  }
  output.info("Run 'tw doctor' for diagnostics");
}

// packages/cli/src/utils/doctorService.ts
init_src3();
init_src4();
function calculateBundleSizeEstimate(classes) {
  const avgClassSize = 15;
  const avgRuleSize = 80;
  return classes.length * (avgClassSize + avgRuleSize);
}
function getTopUnusedClasses(unusedClasses, limit) {
  return unusedClasses.slice(0, limit);
}
async function runDiagnostics(options) {
  const root = options?.root ?? process.cwd();
  const issues = [];
  scanWorkspace(root, {
    includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
    useCache: true
  });
  let analyzerReport;
  try {
    analyzerReport = await analyzeWorkspace(root, {
      semantic: true,
      classStats: {
        top: 100,
        frequentThreshold: 5
      }
    });
  } catch (error) {
    throw new Error(
      `Analyzer is unavailable. ${error instanceof Error ? error.message : String(error)}. Ensure @tailwind-styled/analyzer is properly installed and the native binding is built. Try running: npm run build -w @tailwind-styled/analyzer`
    );
  }
  if (analyzerReport.semantic) {
    const semantic = analyzerReport.semantic;
    const topUnused = getTopUnusedClasses(
      semantic.unusedClasses.filter((c) => c.count > 0),
      10
    );
    for (const unusedClass of topUnused) {
      issues.push({
        severity: "warning",
        type: "unused-class",
        message: `Unused class "${unusedClass.name}" appears ${unusedClass.count} time(s) in your codebase.`,
        suggestion: "Consider removing this class or adding it to your safelist if dynamically generated."
      });
    }
    for (const conflict of semantic.conflicts) {
      issues.push({
        severity: "error",
        type: "class-conflict",
        message: conflict.message,
        location: conflict.variants.length > 0 ? `Variant: ${conflict.variants.join(", ")}` : void 0,
        suggestion: `Classes: ${conflict.classes.join(", ")}`
      });
    }
    for (const unknownClass of semantic.unknownClasses.slice(0, 20)) {
      issues.push({
        severity: "info",
        type: "unknown-class",
        message: `Unknown class "${unknownClass.name}" - not found in Tailwind default utilities.`,
        suggestion: "This might be a custom utility or a typo."
      });
    }
  }
  const bundleSizeEstimate = calculateBundleSizeEstimate(analyzerReport.safelist);
  const bundleSizeKB = Math.round(bundleSizeEstimate / 1024);
  issues.push({
    severity: "info",
    type: "workspace-stats",
    message: `Workspace scan complete: ${analyzerReport.totalFiles} files, ${analyzerReport.uniqueClassCount} unique classes, ${analyzerReport.totalClassOccurrences} total occurrences.`
  });
  issues.push({
    severity: "info",
    type: "bundle-estimate",
    message: `Estimated CSS bundle size: ~${bundleSizeKB}KB (${analyzerReport.safelist.length} classes).`
  });
  if (analyzerReport.semantic?.tailwindConfig) {
    const config = analyzerReport.semantic.tailwindConfig;
    if (config.loaded) {
      issues.push({
        severity: "info",
        type: "tailwind-config",
        message: `Tailwind config loaded: ${config.safelistCount} safelist entries, ${config.customUtilityCount} custom utilities.`
      });
    } else if (config.warning) {
      issues.push({
        severity: "warning",
        type: "tailwind-config",
        message: `Tailwind config warning: ${config.warning}`
      });
    }
  }
  if (options?.verbose) {
    issues.push({
      severity: "info",
      type: "verbose",
      message: `Full class list (${analyzerReport.safelist.length} classes) available in analyzer report.`
    });
  }
  const summary = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length
  };
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    issues,
    summary
  };
}

// packages/cli/src/commands/doctor.ts
async function runDoctorCli(args, context) {
  const verbose = args.includes("--verbose") || args.includes("-v");
  const json = context.json || args.includes("--json");
  try {
    const issues = await executeDiagnostics(context, { verbose });
    if (json) {
      context.output.jsonSuccess("doctor", issues);
      return;
    }
    printDoctorOutput(issues, context.output, verbose);
  } catch (error) {
    context.output.error(`Doctor failed: ${error}`);
  }
}
async function executeDiagnostics(context, options) {
  return await runDiagnostics({ root: process.cwd(), verbose: options.verbose });
}
function printDoctorOutput(result, output, verbose) {
  output.header("Tailwind Styled Doctor");
  const { errors, warnings, info } = result.summary;
  output.info(`Found ${errors} issues, ${warnings} warnings, ${info} info`);
  const errorIssues = result.issues.filter((i) => i.severity === "error");
  const warningIssues = result.issues.filter((i) => i.severity === "warning");
  const infoIssues = result.issues.filter((i) => i.severity === "info");
  if (errorIssues.length > 0) {
    output.subHeader("Issues");
    for (const issue of errorIssues) {
      output.step(issue.message);
      if (issue.location) {
        output.listItem(`Location: ${issue.location}`);
      }
      if (issue.suggestion) {
        output.listItem(`Suggestion: ${issue.suggestion}`);
      }
    }
  }
  if (warningIssues.length > 0) {
    output.subHeader("Warnings");
    for (const issue of warningIssues) {
      output.step(issue.message);
      if (issue.location) {
        output.listItem(`Location: ${issue.location}`);
      }
      if (issue.suggestion) {
        output.listItem(`Suggestion: ${issue.suggestion}`);
      }
    }
  }
  if (infoIssues.length > 0) {
    output.subHeader("Info");
    for (const issue of infoIssues) {
      output.info(issue.message);
      if (issue.suggestion) {
        output.listItem(`Suggestion: ${issue.suggestion}`);
      }
    }
  }
  output.footer("Run 'tw trace <class>' to inspect specific classes");
}

// packages/cli/src/utils/whyService.ts
init_src3();
init_src2();
async function whyClass(className, options) {
  const root = options?.root ?? process.cwd();
  const scanResult = scanWorkspace(root, {
    includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"],
    ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
    useCache: true
  });
  const uniqueClasses = scanResult.uniqueClasses;
  const classFoundInScan = uniqueClasses.includes(className);
  if (!classFoundInScan) {
    throw new Error(
      `Class "${className}" not found in workspace scan. Available classes: ${uniqueClasses.slice(0, 10).join(", ")}${uniqueClasses.length > 10 ? "..." : ""}`
    );
  }
  let css = "";
  try {
    css = compileCssFromClasses(uniqueClasses, { prefix: root }).css;
  } catch (error) {
    throw new Error(
      `Failed to compile CSS: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!css || css.trim() === "") {
    throw new Error(
      `Class "${className}" not found in compiled CSS. The class may not generate any CSS rules.`
    );
  }
  const bundleAnalyzer = new BundleAnalyzer();
  const bundleAnalysis = bundleAnalyzer.analyzeClass(className, scanResult, css);
  const classInCss = css.includes(`.${className}`) || css.includes(`.${className}:`);
  if (!classInCss) {
    throw new Error(
      `Class "${className}" found in scan but not in compiled CSS. This may indicate a configuration issue.`
    );
  }
  const impactTracker = new ImpactTracker();
  const impactReport = impactTracker.calculateImpact(className, bundleAnalysis, scanResult);
  const reverseLookup = new ReverseLookup();
  const dependents = reverseLookup.findDependents(className, css);
  const usedIn = [];
  for (const file of scanResult.files) {
    for (let i = 0; i < file.classes.length; i++) {
      const fileClass = file.classes[i];
      const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass;
      if (normalizedFileClass === className || normalizedFileClass.startsWith(`${className}:`)) {
        usedIn.push({
          file: file.file,
          line: 1,
          column: 1,
          usage: fileClass
        });
      }
    }
  }
  if (usedIn.length === 0) {
    throw new Error(
      `Class "${className}" was found in scan and CSS but no actual usage locations could be determined.`
    );
  }
  return {
    className: bundleAnalysis.className,
    bundleContribution: bundleAnalysis.bundleSizeBytes,
    usedIn,
    variantChain: bundleAnalysis.variantChains,
    impact: {
      risk: impactReport.riskLevel,
      componentsAffected: impactReport.totalComponents,
      estimatedSavings: impactReport.estimatedSavings
    },
    suggestions: impactReport.suggestions,
    dependents
  };
}

// packages/cli/src/commands/why.ts
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function printWhyOutput(result, output) {
  const { className, bundleContribution, usedIn, variantChain, impact, suggestions, dependents } = result;
  output.writeText(`\u{1F4E6} ${className}`);
  output.writeText(`\u251C\u2500 Bundle contribution: ${formatSize(bundleContribution)}`);
  const usedInCount = usedIn.length;
  output.writeText(`\u251C\u2500 Used in: ${usedInCount} components`);
  if (usedIn.length > 0) {
    for (let i = 0; i < usedIn.length; i++) {
      const usage = usedIn[i];
      const prefix = i === usedIn.length - 1 ? "\u2502   \u2514\u2500" : "\u2502   \u251C\u2500";
      output.writeText(`${prefix} ${usage.file}:${usage.line} (${usage.usage})`);
    }
  }
  output.writeText(`\u251C\u2500 Variant chain: ${variantChain.join(", ")}`);
  const riskLabel = impact.risk.charAt(0).toUpperCase() + impact.risk.slice(1);
  output.writeText(`\u251C\u2500 Impact: ${riskLabel} risk (${impact.componentsAffected} components)`);
  output.writeText(`\u2502   \u251C\u2500 Potential savings: ${formatSize(impact.estimatedSavings)}`);
  if (suggestions.length > 0) {
    output.writeText(`\u2502   \u2514\u2500 Suggestions:`);
    for (let i = 0; i < suggestions.length; i++) {
      const prefix = i === suggestions.length - 1 ? "\u2502       \u2514\u2500" : "\u2502       \u251C\u2500";
      output.writeText(`${prefix} ${suggestions[i]}`);
    }
  } else {
    output.writeText(`\u2502   \u2514\u2500 Suggestions: none`);
  }
  output.writeText(`\u2514\u2500 Dependents: ${dependents.length > 0 ? dependents.join(", ") : "none"}`);
  if (dependents.length > 0) {
    for (let i = 0; i < dependents.length; i++) {
      const prefix = i === dependents.length - 1 ? "    \u2514\u2500" : "    \u251C\u2500";
      output.writeText(`${prefix} ${dependents[i]}`);
    }
  }
}
async function runWhyCli(args, context) {
  const className = args[0];
  if (!className) {
    context.output.error("Usage: tw why <class-name>");
    context.output.info("Example: tw why btn-primary");
    return;
  }
  try {
    const result = await whyClass(className, { root: process.cwd() });
    if (context.json) {
      context.output.jsonSuccess("why", result);
    } else {
      printWhyOutput(result, context.output);
    }
  } catch (error) {
    context.output.error(`Failed to analyze class: ${error}`);
  }
}

// packages/cli/src/commands/program.ts
init_runtime();

// packages/cli/src/commands/create.ts
init_args();
var createCommand2 = {
  name: "create",
  async run(args, context) {
    const createMod = await init_createApp().then(() => createApp_exports);
    const commandArgs = context.json ? ensureFlag("json", args) : args;
    await createMod.main(commandArgs);
  }
};

// packages/cli/src/commands/dashboard.ts
init_errors();
init_fs();

// packages/cli/src/commands/helpers.ts
init_errors();
init_paths();
function enumerateVariantProps(matrix) {
  const keys = Object.keys(matrix);
  if (keys.length === 0) return [{}];
  const result = [];
  function walk(index, current) {
    if (index >= keys.length) {
      result.push({ ...current });
      return;
    }
    const key = keys[index];
    const values = matrix[key] ?? [];
    for (const value of values) {
      current[key] = value;
      walk(index + 1, current);
    }
  }
  walk(0, {});
  return result;
}
async function resolveScript(context, relativeToRepoRoot) {
  const fromRuntime = await resolveMonorepoPath(context.runtimeDir, relativeToRepoRoot);
  const fromCwd = path2.resolve(process.cwd(), relativeToRepoRoot);
  const resolved = await firstExistingPath([fromRuntime, fromCwd]);
  if (!resolved) {
    throw new CliUsageError(`Required script not found: ${relativeToRepoRoot}`);
  }
  return resolved;
}
async function loadRegistry(context) {
  const runtimeRegistryPath = await resolveMonorepoPath(
    context.runtimeDir,
    "packages/plugin-registry/registry.json"
  );
  const candidates = [
    runtimeRegistryPath,
    path2.resolve(process.cwd(), "packages/plugin-registry/registry.json")
  ];
  const registryPath = await firstExistingPath(candidates);
  if (!registryPath) {
    throw new CliUsageError("Plugin registry file not found.");
  }
  const raw = await fs5.readFile(registryPath, "utf8");
  const data = JSON.parse(raw);
  return [
    ...data.official.map((item) => ({ ...item, official: true })),
    ...data.community.map((item) => ({ ...item, official: false }))
  ];
}
function validatePackageName(value) {
  return /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i.test(value);
}

// packages/cli/src/commands/dashboard.ts
var dashboardCommand = {
  name: "dashboard",
  async run(args, context) {
    if (context.json) {
      throw new CliUsageError(
        "[tw dashboard] --json is not supported for long-running dashboard output"
      );
    }
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        port: { type: "string" }
      }
    });
    const port = typeof parsed.values.port === "string" ? parsed.values.port : process.env.PORT ?? "3000";
    const serverScript = await resolveScript(context, "packages/dashboard/src/server.mjs");
    if (await pathExists2(serverScript)) {
      context.output.writeText(`[tw dashboard] Starting on http://localhost:${port}`);
      await runCommand(process.execPath, [serverScript], {
        env: { ...process.env, PORT: port }
      });
      return;
    }
    await runCommand(npmCommandName(), ["run", "dev", "-w", "@tailwind-styled/dashboard"], {
      env: { ...process.env, PORT: port }
    });
  }
};

// packages/cli/src/commands/deploy.ts
init_errors();
init_fs();
init_json();
async function postJson(url, body, token) {
  const { default: https } = await import('https');
  const { default: http } = await import('http');
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          ...token ? { authorization: `Bearer ${token}` } : {}
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk.toString("utf8");
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
var deployCommand = {
  name: "deploy",
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        "dry-run": { type: "boolean", default: false },
        version: { type: "string" },
        tag: { type: "string" },
        registry: { type: "string" }
      }
    });
    const name = parsed.positionals[0] ?? "component";
    const dryRun = Boolean(parsed.values["dry-run"]);
    const version = typeof parsed.values.version === "string" ? parsed.values.version : "0.1.0";
    const tag = typeof parsed.values.tag === "string" ? parsed.values.tag : "latest";
    const registryUrl = typeof parsed.values.registry === "string" ? parsed.values.registry : process.env.TW_REGISTRY_URL ?? null;
    const pkgPath = path2.join(process.cwd(), "package.json");
    if (!await pathExists2(pkgPath)) {
      throw new CliUsageError("[tw deploy] No package.json found in current directory");
    }
    const pkg = await readJsonSafe(pkgPath);
    if (!pkg) {
      throw new CliUsageError("[tw deploy] package.json is not valid JSON");
    }
    const componentName = pkg.name ?? name;
    const manifest = {
      name: componentName,
      version: pkg.version ?? version,
      tag,
      description: pkg.description ?? "",
      keywords: pkg.keywords ?? [],
      publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: process.cwd(),
      registry: registryUrl ?? "https://registry.tailwind-styled.dev"
    };
    if (dryRun) {
      if (context.json) {
        writeJsonSuccess("deploy", {
          mode: "dry-run",
          component: componentName,
          registry: registryUrl ?? manifest.registry,
          manifest
        });
      } else {
        context.output.writeText("[tw deploy] DRY RUN - would publish:");
        context.output.writeText(JSON.stringify(manifest, null, 2));
        if (registryUrl) context.output.writeText(`
[tw deploy] Target registry: ${registryUrl}`);
      }
      return;
    }
    const cacheDir = path2.join(process.cwd(), ".tw-cache");
    await fs5.mkdir(cacheDir, { recursive: true });
    await fs5.writeFile(
      path2.join(cacheDir, "deploy-manifest.json"),
      JSON.stringify(manifest, null, 2)
    );
    if (!registryUrl) {
      if (context.json) {
        writeJsonSuccess("deploy", {
          mode: "local",
          component: componentName,
          version: manifest.version,
          manifestPath: ".tw-cache/deploy-manifest.json",
          nextSteps: ["tw deploy --registry=http://localhost:4040", "tw registry serve"]
        });
      } else {
        context.output.writeText(
          `[tw deploy] Published locally: ${componentName}@${manifest.version}`
        );
        context.output.writeText("[tw deploy] Manifest: .tw-cache/deploy-manifest.json");
        context.output.writeText(
          "[tw deploy] To publish remotely: tw deploy --registry=http://localhost:4040"
        );
        context.output.writeText("[tw deploy] Start registry:      tw registry serve");
      }
      return;
    }
    try {
      const url = new URL("/packages", registryUrl);
      const body = JSON.stringify(manifest);
      const token = process.env.TW_REGISTRY_TOKEN;
      const result = await postJson(url, body, token);
      if (result.status === 201) {
        const payload = result.body;
        if (context.json) {
          writeJsonSuccess("deploy", {
            mode: "remote",
            component: componentName,
            version: manifest.version,
            registry: `${registryUrl}/packages/${componentName}`,
            id: typeof payload === "object" && payload && "id" in payload ? payload.id ?? null : null
          });
        } else {
          context.output.writeText(`[tw deploy] Published: ${componentName}@${manifest.version}`);
          context.output.writeText(`[tw deploy] Registry: ${registryUrl}/packages/${componentName}`);
          if (typeof payload === "object" && payload && "id" in payload && payload.id) {
            context.output.writeText(`[tw deploy] ID: ${payload.id}`);
          }
        }
        return;
      }
      throw new CliError(
        `[tw deploy] Registry returned ${String(result.status)}: ${JSON.stringify(result.body)}`,
        { code: "DEPLOY_REGISTRY_ERROR" }
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      const message = errorMessage(error);
      throw new CliError(`[tw deploy] Registry unreachable: ${message}`, { cause: error });
    }
  }
};
init_errors();
init_fs();
init_json();
var testCommand = {
  name: "test",
  async run(args) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        watch: { type: "boolean", default: false }
      }
    });
    const watch = Boolean(parsed.values.watch);
    await runCommand(npmCommandName(), watch ? ["run", "test", "--", "--watch"] : ["run", "test"]);
  }
};
var aiCommand = {
  name: "ai",
  async run(args, context) {
    const prompt = args.join(" ").trim();
    if (!prompt) throw new CliUsageError('Usage: tw ai "describe component"');
    const script = await resolveScript(context, "scripts/v45/ai.mjs");
    await runCommand(process.execPath, [script, prompt]);
  }
};
var shareCommand = {
  name: "share",
  async run(args, context) {
    const name = args.find((arg) => !arg.startsWith("-")) ?? "component-name";
    const manifestPath = path2.join(process.cwd(), ".tw-cache", "deploy-manifest.json");
    let manifest = { name, version: "0.1.0" };
    const parsed = await readJsonSafe(manifestPath);
    if (parsed) {
      manifest = { ...manifest, ...parsed };
    }
    const resolvedName = manifest.name ?? name;
    const sharePayload = {
      name: resolvedName,
      version: manifest.version ?? "0.1.0",
      description: manifest.description ?? "",
      keywords: manifest.keywords ?? [],
      registry: manifest.registry ?? "https://registry.tailwind-styled.dev",
      installCommand: `npm install ${resolvedName}`,
      importExample: `import { ${resolvedName.replace(/[^a-zA-Z]/g, "")} } from "${resolvedName}"`,
      channel: "community",
      sharedAt: (/* @__PURE__ */ new Date()).toISOString(),
      instructions: [
        "1. Attach README.md with usage examples",
        `2. Add version tag: git tag v${manifest.version ?? "0.1.0"}`,
        "3. Run `tw deploy` to publish to registry",
        "4. Share this payload in community channels"
      ]
    };
    if (context.json) {
      writeJsonSuccess("share", sharePayload);
      return;
    }
    context.output.writeText(JSON.stringify(sharePayload, null, 2));
  }
};
var codeCommand = {
  name: "code",
  async run(args, context) {
    const docsUrl = "https://marketplace.visualstudio.com/search?term=tailwind-styled&target=VSCode";
    const extension = "tailwind-styled.tailwind-styled-v4";
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        docs: { type: "boolean", default: false },
        install: { type: "boolean", default: false }
      }
    });
    const docs = Boolean(parsed.values.docs);
    const install = Boolean(parsed.values.install);
    if (docs) {
      if (context.json) {
        writeJsonSuccess("code", { action: "docs", url: docsUrl });
        return;
      }
      context.output.writeText(docsUrl);
      return;
    }
    if (install) {
      await runCommand(codeCommandName(), ["--install-extension", extension], {
        stdio: context.json ? "pipe" : "inherit"
      });
      if (context.json) {
        writeJsonSuccess("code", { action: "install", extension });
      }
      return;
    }
    if (context.json) {
      writeJsonSuccess("code", { action: "help", usage: "tw code --docs | tw code --install" });
      return;
    }
    context.output.writeText("Use: tw code --docs | tw code --install");
  }
};
var CLI_PACKAGE_NAME = "create-tailwind-styled";
function parseSemver(version) {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}
function isVersionOutdated(currentVersion, latestVersion) {
  const current = parseSemver(currentVersion);
  const latest = parseSemver(latestVersion);
  if (!current || !latest) return null;
  for (let index = 0; index < 3; index++) {
    if (current[index] === latest[index]) continue;
    return current[index] < latest[index];
  }
  return false;
}
async function resolveCurrentCliVersion(context) {
  const candidates = [
    path2.resolve(context.runtimeDir, "..", "package.json"),
    path2.resolve(process.cwd(), "packages", "cli", "package.json"),
    path2.resolve(process.cwd(), "package.json")
  ];
  for (const candidate of candidates) {
    if (!await pathExists2(candidate)) continue;
    const pkg = await readJsonSafe(candidate);
    if (pkg?.version && (pkg.name === CLI_PACKAGE_NAME || candidate.includes(`${path2.sep}packages${path2.sep}cli${path2.sep}`))) {
      return pkg.version;
    }
  }
  return "0.0.0";
}
async function fetchLatestCliVersion() {
  const response = await fetch(`https://registry.npmjs.org/${CLI_PACKAGE_NAME}/latest`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload.version || typeof payload.version !== "string") {
    throw new Error("Invalid npm registry response");
  }
  return payload.version;
}
async function buildVersionPayload(context, checkLatest) {
  const currentVersion = await resolveCurrentCliVersion(context);
  if (!checkLatest) {
    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion,
      latestVersion: null,
      updateAvailable: null,
      checkFailed: null
    };
  }
  try {
    const latestVersion = await fetchLatestCliVersion();
    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion,
      latestVersion,
      updateAvailable: isVersionOutdated(currentVersion, latestVersion),
      checkFailed: null
    };
  } catch (error) {
    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion,
      latestVersion: null,
      updateAvailable: null,
      checkFailed: error instanceof Error ? error.message : String(error)
    };
  }
}
var versionCommand = {
  name: "version",
  aliases: ["v"],
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        check: { type: "boolean", default: false }
      }
    });
    const checkLatest = Boolean(parsed.values.check);
    const payload = await buildVersionPayload(context, checkLatest);
    if (context.json) {
      writeJsonSuccess("version", payload);
      return;
    }
    context.output.writeText(`tw version: ${payload.currentVersion}`);
    if (!checkLatest) return;
    if (payload.checkFailed) {
      context.output.writeText(`Latest check failed: ${payload.checkFailed}`);
      return;
    }
    if (payload.latestVersion && payload.updateAvailable) {
      context.output.writeText(`Update available: ${payload.latestVersion}`);
      context.output.writeText("Run: tw upgrade");
      return;
    }
    if (payload.latestVersion) {
      context.output.writeText(`Up to date (latest: ${payload.latestVersion})`);
    }
  }
};
var upgradeCommand = {
  name: "upgrade",
  aliases: ["update"],
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        install: { type: "boolean", default: false }
      }
    });
    const install = Boolean(parsed.values.install);
    const payload = await buildVersionPayload(context, true);
    if (payload.checkFailed) {
      if (context.json) {
        writeJsonSuccess("upgrade", { ...payload, installAttempted: false, installExecuted: false });
        return;
      }
      context.output.writeText(`Latest check failed: ${payload.checkFailed}`);
      return;
    }
    const shouldUpdate = payload.updateAvailable === true;
    if (!shouldUpdate) {
      if (context.json) {
        writeJsonSuccess("upgrade", {
          ...payload,
          installAttempted: install,
          installExecuted: false
        });
      } else {
        context.output.writeText(`Already up to date (${payload.currentVersion})`);
      }
      return;
    }
    if (!install) {
      if (context.json) {
        writeJsonSuccess("upgrade", {
          ...payload,
          installAttempted: false,
          installExecuted: false,
          installHint: `npm install -g ${CLI_PACKAGE_NAME}@latest`
        });
      } else {
        context.output.writeText(
          `Update available: ${payload.currentVersion} -> ${payload.latestVersion}`
        );
        context.output.writeText("Run: tw upgrade --install");
      }
      return;
    }
    await runCommand(npmCommandName(), ["install", "-g", `${CLI_PACKAGE_NAME}@latest`], {
      stdio: context.json ? "pipe" : "inherit"
    });
    if (context.json) {
      writeJsonSuccess("upgrade", { ...payload, installAttempted: true, installExecuted: true });
      return;
    }
    context.output.writeText(`Upgrade command executed for ${CLI_PACKAGE_NAME}@latest`);
  }
};
var miscCommands = [
  testCommand,
  aiCommand,
  shareCommand,
  codeCommand,
  versionCommand,
  upgradeCommand
];

// packages/cli/src/commands/plugin.ts
init_errors();
init_json();
var pluginCommand = {
  name: "plugin",
  async run(args, context) {
    const subcommand = args[0];
    const pluginArgs = args.slice(1);
    if (subcommand === "update-check") {
      const script = await resolveScript(context, "packages/plugin-registry/dist/cli.js");
      if (context.json) {
        await runCommandAsJson("plugin.update-check", process.execPath, [script, "update-check"]);
      } else {
        await runCommand(process.execPath, [script, "update-check"]);
      }
      return;
    }
    if (subcommand === "verify") {
      const pkgName = pluginArgs[0];
      if (!pkgName) throw new CliUsageError("Usage: tw plugin verify <package-name>");
      const script = await resolveScript(context, "packages/plugin-registry/dist/cli.js");
      if (context.json) {
        await runCommandAsJson("plugin.verify", process.execPath, [script, "verify", pkgName]);
      } else {
        await runCommand(process.execPath, [script, "verify", pkgName]);
      }
      return;
    }
    if (subcommand === "marketplace" || subcommand === "publish") {
      const script = await resolveScript(context, "scripts/v45/marketplace.mjs");
      const marketplaceCommand = subcommand === "publish" ? "publish" : pluginArgs[0] ?? "help";
      const forwarded = subcommand === "marketplace" ? pluginArgs.slice(1) : pluginArgs;
      if (context.json) {
        await runCommandAsJson(`plugin.${subcommand}`, process.execPath, [
          script,
          marketplaceCommand,
          ...forwarded
        ]);
      } else {
        await runCommand(process.execPath, [script, marketplaceCommand, ...forwarded]);
      }
      return;
    }
    const plugins = await loadRegistry(context);
    if (subcommand === "search") {
      const query = pluginArgs.join(" ").toLowerCase().trim();
      const results = plugins.filter((plugin) => {
        if (!query) return true;
        return plugin.name.toLowerCase().includes(query) || plugin.description.toLowerCase().includes(query) || plugin.tags.some((tag) => tag.toLowerCase().includes(query));
      });
      if (context.json) {
        writeJsonSuccess("plugin.search", { query, count: results.length, results });
      } else {
        context.output.table(results);
      }
      return;
    }
    if (subcommand === "list") {
      if (context.json) {
        writeJsonSuccess("plugin.list", { count: plugins.length, plugins });
      } else {
        context.output.table(plugins);
      }
      return;
    }
    if (subcommand === "install") {
      const pluginName = pluginArgs[0];
      if (!pluginName) throw new CliUsageError("Usage: tw plugin install <name>");
      if (!validatePackageName(pluginName)) {
        throw new CliUsageError(`Invalid package name: ${pluginName}`);
      }
      if (context.json) {
        await runCommand(npmCommandName(), ["install", pluginName], { stdio: "pipe" });
        writeJsonSuccess("plugin.install", {
          package: pluginName,
          manager: npmCommandName(),
          installed: true
        });
      } else {
        await runCommand(npmCommandName(), ["install", pluginName]);
      }
      return;
    }
    throw new CliUsageError("Unknown plugin command");
  }
};

// packages/cli/src/preflight.ts
init_args();
init_errors();
init_fs();
init_json();
var DEFAULT_TAILWIND_CSS2 = '@import "tailwindcss";\n';
var DEFAULT_TW_CONFIG = JSON.stringify(
  {
    version: 1,
    compiler: { engine: "rust" },
    css: { entry: "src/tailwind.css" }
  },
  null,
  2
) + "\n";
function pkgHasDep(pkg, name) {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}
function nodeVersion() {
  const full = process.version.replace("v", "");
  const major = parseInt(full.split(".")[0], 10);
  return { major, full };
}
function resolveCliEntry(scriptPath) {
  if (scriptPath.endsWith("preflight.ts")) {
    return scriptPath.replace(/preflight\.ts$/, "index.ts");
  }
  if (scriptPath.endsWith("preflight.js")) {
    return scriptPath.replace(/preflight\.js$/, "index.js");
  }
  return scriptPath;
}
async function hasTailwindCssImport(cwd2) {
  const cssFiles = ["src/app/globals.css", "src/index.css", "src/style.css", "app/globals.css"];
  for (const file of cssFiles) {
    const raw = await readFileSafe(path2.join(cwd2, file));
    if (raw?.includes("tailwindcss")) return true;
  }
  return false;
}
async function applyTailwindInit(cwd2) {
  await ensureFileSafe(path2.join(cwd2, "src", "tailwind.css"), DEFAULT_TAILWIND_CSS2);
  await ensureFileSafe(path2.join(cwd2, "tailwind-styled.config.json"), DEFAULT_TW_CONFIG);
}
function check(results, id, label, pass, message, fix) {
  results.push({ id, label, pass, message, fix });
}
async function runPreflightCli(rawArgs) {
  const autoFix = hasFlag("fix", rawArgs);
  const jsonMode = hasFlag("json", rawArgs);
  const allowFail = hasFlag("allow-fail", rawArgs);
  const cwd2 = process.cwd();
  const results = [];
  const node = nodeVersion();
  check(
    results,
    "node-version",
    "Node.js version",
    node.major >= 20,
    // Keep this literal for source-verification test compatibility:
    // "node.major >= 20"
    node.major >= 20 ? `Node ${node.full} OK` : `Node ${node.full} - requires >=20. Download: https://nodejs.org`,
    node.major < 20 ? "Install Node.js 20 LTS or newer from https://nodejs.org" : void 0
  );
  const pkg = await readJsonSafe(path2.join(cwd2, "package.json"));
  check(
    results,
    "package-json",
    "package.json exists",
    pkg !== null,
    pkg ? "Found package.json OK" : "No package.json - run `npm init` first"
  );
  if (pkg) {
    const hasTw = pkgHasDep(pkg, "tailwind-styled-v4") || pkgHasDep(pkg, "@tailwind-styled/core");
    check(
      results,
      "tailwind-styled",
      "tailwind-styled-v4 installed",
      hasTw,
      hasTw ? "tailwind-styled-v4 found OK" : "Not installed - run: npm install tailwind-styled-v4",
      "npm install tailwind-styled-v4"
    );
    const hasVite = pkgHasDep(pkg, "@tailwind-styled/vite") || pkgHasDep(pkg, "vite");
    const hasNext = pkgHasDep(pkg, "next");
    const hasRspack = pkgHasDep(pkg, "@tailwind-styled/rspack") || pkgHasDep(pkg, "@rspack/core");
    const hasBundler = hasVite || hasNext || hasRspack;
    const bundlerName = hasNext ? "Next.js" : hasVite ? "Vite" : hasRspack ? "Rspack" : "none";
    check(
      results,
      "bundler",
      "Bundler detected",
      hasBundler,
      hasBundler ? `${bundlerName} detected OK` : "No supported bundler (Vite/Next.js/Rspack) found",
      "Install a bundler: npm install vite @vitejs/plugin-react OR npx create-next-app"
    );
    const hasMerge = pkgHasDep(pkg, "tailwind-merge");
    check(
      results,
      "tailwind-merge",
      "tailwind-merge installed",
      hasMerge,
      hasMerge ? "tailwind-merge found OK" : "Missing peer dep - run: npm install tailwind-merge",
      "npm install tailwind-merge"
    );
  }
  const twConfigFiles = ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs"];
  const twConfigChecks = await Promise.all(
    twConfigFiles.map(async (file) => ({ file, exists: await pathExists2(path2.join(cwd2, file)) }))
  );
  const foundTwConfig = twConfigChecks.find((item) => item.exists)?.file ?? null;
  const hasCssConfig = await hasTailwindCssImport(cwd2);
  check(
    results,
    "tailwind-config",
    "Tailwind config present",
    foundTwConfig !== null || hasCssConfig,
    foundTwConfig ? `${foundTwConfig} found OK` : hasCssConfig ? "@import tailwindcss found in CSS OK" : "No Tailwind config found - run: tw init",
    "tw init"
  );
  const oldConfig = await readJsonSafe(path2.join(cwd2, "tailwind.config.js")) ?? await readJsonSafe(path2.join(cwd2, "tailwind.config.ts"));
  if (oldConfig) {
    const hasOldJit = oldConfig.mode === "jit";
    const hasOldPurge = "purge" in oldConfig;
    const deprecated = hasOldJit || hasOldPurge;
    check(
      results,
      "deprecated-config",
      "No deprecated config patterns",
      !deprecated,
      deprecated ? `Deprecated: ${hasOldJit ? '"mode: jit"' : ""} ${hasOldPurge ? '"purge"' : ""} -> use Tailwind v4 CSS-first` : "No deprecated patterns found OK",
      "Run: tw migrate --dry-run to see migration steps"
    );
  }
  const hasTsConfig = await pathExists2(path2.join(cwd2, "tsconfig.json"));
  check(
    results,
    "typescript",
    "TypeScript configured",
    hasTsConfig,
    hasTsConfig ? "tsconfig.json found OK" : "No tsconfig.json (optional - recommended for best DX)"
  );
  if (autoFix) {
    resolveCliEntry(process.argv[1] ?? "");
    for (const result of results) {
      if (result.pass) continue;
      if (result.id === "tailwind-config" && result.fix === "tw init") {
        try {
          await applyTailwindInit(cwd2);
          result.autoFixed = true;
          result.message += " -> auto-initialized";
        } catch {
        }
      }
    }
  }
  const passed = results.filter((result) => result.pass).length;
  const failed = results.filter((result) => !result.pass && result.id !== "typescript").length;
  const warnings = results.filter((result) => !result.pass && result.id === "typescript").length;
  const report = {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    summary: { passed, failed, warnings, total: results.length },
    checks: results
  };
  if (jsonMode) {
    writeJsonSuccess("preflight", report);
  } else {
    console.log("\nPreflight check\n");
    for (const result of results) {
      const icon = result.pass ? "[ok]" : result.id === "typescript" ? "[warn]" : "[fail]";
      const status = result.autoFixed ? " [auto-fixed]" : "";
      console.log(`${icon} ${result.label}`);
      console.log(`   ${result.message}${status}`);
      if (!result.pass && result.fix && result.id !== "typescript") {
        console.log(`   Fix: ${result.fix}`);
      }
      console.log("");
    }
    if (failed === 0) {
      console.log(`[ok] All checks passed (${passed}/${results.length})
`);
    } else {
      console.log(`[fail] ${failed} check(s) failed - see above for fixes`);
      console.log("       Run 'tw preflight --fix' to auto-fix what's possible\n");
    }
  }
  if (failed > 0 && !allowFail) {
    process.exitCode = 1;
  }
  return report;
}
function isDirectExecution2() {
  const scriptPath = process.argv[1];
  if (!scriptPath) return false;
  return import.meta.url === pathToFileURL(scriptPath).href;
}
if (isDirectExecution2()) {
  runPreflightCli(process.argv.slice(2)).catch((error) => {
    const rawArgs = process.argv.slice(2);
    const jsonMode = hasFlag("json", rawArgs);
    const debugMode = hasFlag("debug", rawArgs) || process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1";
    if (jsonMode) {
      console.log(errorToJson(error, debugMode, "preflight"));
    } else if (debugMode && error instanceof Error && error.stack) {
      console.error(error.stack);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = errorExitCode(error);
  });
}

// packages/cli/src/commands/preflight.ts
init_args();
var preflightCommand = {
  name: "preflight",
  async run(args, context) {
    const commandArgs = context.json ? ensureFlag("json", args) : args;
    await runPreflightCli(commandArgs);
  }
};

// packages/cli/src/commands/registry.ts
init_errors();
var registryCommand = {
  name: "registry",
  async run(args, context) {
    const sub = args[0] ?? "serve";
    if (context.json && sub === "serve") {
      throw new CliUsageError(
        "[tw registry serve] --json is not supported for long-running server mode"
      );
    }
    const isTarball = ["publish", "install", "versions"].includes(sub);
    const script = await resolveScript(
      context,
      isTarball ? "scripts/v45/registry-tarball.mjs" : "scripts/v45/registry.mjs"
    );
    const commandArgs = [script, sub, ...args.slice(1)];
    if (context.json) {
      await runCommandAsJson(`registry.${sub}`, process.execPath, commandArgs);
    } else {
      await runCommand(process.execPath, commandArgs);
    }
  }
};
var installRegistryCommand = {
  name: "install",
  async run(args, context) {
    const script = await resolveScript(context, "scripts/v45/registry-tarball.mjs");
    const commandArgs = [script, "install", ...args];
    if (context.json) {
      await runCommandAsJson("registry.install", process.execPath, commandArgs);
    } else {
      await runCommand(process.execPath, commandArgs);
    }
  }
};

// packages/cli/src/commands/scriptCommands.ts
init_errors();
async function runScriptCommand(commandName, context, relativeScriptPath, args, options = {}) {
  if (context.json && options.jsonUnsupported) {
    throw new CliUsageError(
      `[tw ${commandName}] --json is not supported for long-running command mode`
    );
  }
  const script = await resolveScript(context, relativeScriptPath);
  const commandArgs = [script, ...args];
  if (context.json) {
    await runCommandAsJson(commandName, process.execPath, commandArgs);
  } else {
    await runCommand(process.execPath, commandArgs);
  }
}
var parseCommand = {
  name: "parse",
  async run(args, context) {
    const file = args[0];
    if (!file) throw new CliUsageError("Usage: tw parse <file>");
    await runScriptCommand("parse", context, "scripts/v46/parse.mjs", [file]);
  }
};
var transformCommand = {
  name: "transform",
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        output: { type: "string" }
      }
    });
    const file = parsed.positionals[0];
    const out = typeof parsed.values.output === "string" ? parsed.values.output : parsed.positionals[1];
    if (!file) throw new CliUsageError("Usage: tw transform <file> [outFile]");
    const commandArgs = [file];
    if (out) commandArgs.push(out);
    await runScriptCommand("transform", context, "scripts/v46/transform.mjs", commandArgs);
  }
};
var minifyCommand = {
  name: "minify",
  async run(args, context) {
    const file = args[0];
    if (!file) throw new CliUsageError("Usage: tw minify <file>");
    await runScriptCommand("minify", context, "scripts/v47/minify.mjs", [file]);
  }
};
var shakeCommand = {
  name: "shake",
  async run(args, context) {
    const file = args[0];
    if (!file) throw new CliUsageError("Usage: tw shake <css-file>");
    await runScriptCommand("shake", context, "scripts/v47/shake-css.mjs", [file]);
  }
};
var lintCommand = {
  name: "lint",
  async run(args, context) {
    const dir = args[0] ?? ".";
    const workers = args[1] ?? "0";
    await runScriptCommand("lint", context, "scripts/v48/lint-parallel.mjs", [dir, workers]);
  }
};
var formatCommand2 = {
  name: "format",
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        write: { type: "boolean", default: false }
      }
    });
    const file = parsed.positionals[0];
    if (!file) throw new CliUsageError("Usage: tw format <file> [--write]");
    const commandArgs = [file];
    if (parsed.values.write) commandArgs.push("--write");
    await runScriptCommand("format", context, "scripts/v48/format.mjs", commandArgs);
  }
};
var lspCommand = {
  name: "lsp",
  async run(args, context) {
    await runScriptCommand("lsp", context, "scripts/v48/lsp.mjs", ["--stdio", ...args], {
      jsonUnsupported: true
    });
  }
};
var benchmarkCommand = {
  name: "benchmark",
  async run(args, context) {
    await runScriptCommand("benchmark", context, "scripts/v48/benchmark-toolchains.mjs", args);
  }
};
var optimizeCommand = {
  name: "optimize",
  async run(args, context) {
    const file = args[0];
    if (!file) {
      throw new CliUsageError("Usage: tw optimize <file> [--constant-folding] [--partial-eval]");
    }
    await runScriptCommand("optimize", context, "scripts/v49/optimize.mjs", args);
  }
};
var splitCommand = {
  name: "split",
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        output: { type: "string" }
      }
    });
    const root = parsed.positionals[0] ?? ".";
    const outDir = typeof parsed.values.output === "string" ? parsed.values.output : parsed.positionals[1] ?? "artifacts/route-css";
    await runScriptCommand("split", context, "scripts/v49/split-routes.mjs", [root, outDir]);
  }
};
var criticalCommand = {
  name: "critical",
  async run(args, context) {
    const html = args[0];
    const css = args[1];
    if (!html || !css) throw new CliUsageError("Usage: tw critical <html-file> <css-file>");
    await runScriptCommand("critical", context, "scripts/v49/critical-css.mjs", [html, css]);
  }
};
var cacheCommand = {
  name: "cache",
  async run(args, context) {
    const commandArgs = [];
    if (args[0]) commandArgs.push(args[0]);
    if (args[1]) commandArgs.push(args[1]);
    await runScriptCommand("cache", context, "scripts/v50/cache.mjs", commandArgs);
  }
};
var clusterCommand = {
  name: "cluster",
  async run(args, context) {
    const commandArgs = [];
    if (args[0]) commandArgs.push(args[0]);
    if (args[1]) commandArgs.push(args[1]);
    args.filter((arg) => arg.startsWith("--remote=") || arg.startsWith("--token=")).forEach((arg) => commandArgs.push(arg));
    await runScriptCommand("cluster", context, "scripts/v50/cluster.mjs", commandArgs);
  }
};
var clusterServerCommand = {
  name: "cluster-server",
  async run(args, context) {
    await runScriptCommand("cluster-server", context, "scripts/v50/cluster-server.mjs", args, {
      jsonUnsupported: true
    });
  }
};
var adoptCommand = {
  name: "adopt",
  async run(args, context) {
    const feature = args[0];
    const project = args[1];
    const commandArgs = [];
    if (feature) commandArgs.push(feature);
    if (project) commandArgs.push(project);
    await runScriptCommand("adopt", context, "scripts/v50/adopt.mjs", commandArgs);
  }
};
var metricsCommand = {
  name: "metrics",
  async run(args, context) {
    const port = args[0] ?? "3030";
    await runScriptCommand("metrics", context, "scripts/v50/metrics.mjs", [port], {
      jsonUnsupported: true
    });
  }
};
var auditCommand = {
  name: "audit",
  async run(args, context) {
    await runScriptCommand("audit", context, "scripts/v45/audit.mjs", args);
  }
};
var scriptCommands = [
  parseCommand,
  transformCommand,
  minifyCommand,
  shakeCommand,
  lintCommand,
  formatCommand2,
  lspCommand,
  benchmarkCommand,
  optimizeCommand,
  splitCommand,
  criticalCommand,
  cacheCommand,
  clusterCommand,
  clusterServerCommand,
  adoptCommand,
  metricsCommand,
  auditCommand
];

// packages/cli/src/commands/storybook.ts
init_fs();
init_json();
init_errors();
var storybookCommand = {
  name: "storybook",
  async run(args, context) {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        variants: { type: "string" },
        port: { type: "string" },
        "no-open": { type: "boolean", default: false }
      }
    });
    const variantsRaw = typeof parsed.values.variants === "string" ? parsed.values.variants : null;
    const port = typeof parsed.values.port === "string" ? parsed.values.port : "6006";
    const open = !Boolean(parsed.values["no-open"]);
    if (variantsRaw) {
      try {
        const matrix = JSON.parse(variantsRaw);
        const rows = enumerateVariantProps(matrix);
        if (context.json) {
          writeJsonSuccess("storybook.variants", { count: rows.length, rows });
        } else {
          context.output.writeText(JSON.stringify(rows, null, 2));
        }
      } catch (error) {
        throw new CliUsageError("Invalid JSON in --variants flag", { cause: error });
      }
      return;
    }
    if (context.json) {
      throw new CliUsageError("[tw storybook] --json is only supported with --variants");
    }
    context.output.writeText(`[tw storybook] Starting Storybook on port ${port}...`);
    context.output.writeText(
      `[tw storybook] Tip: use --variants='{"size":["sm","lg"]}' to enumerate variant combinations`
    );
    const localBin = path2.join(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "storybook.cmd" : "storybook"
    );
    const storybookArgs = ["dev", "-p", port];
    if (!open) storybookArgs.push("--no-open");
    if (await pathExists2(localBin)) {
      await runCommand(localBin, storybookArgs);
      return;
    }
    await runCommand(npxCommandName(), ["storybook", ...storybookArgs]);
  }
};

// packages/cli/src/commands/studio.ts
init_errors();
var studioCommand = {
  name: "studio",
  async run(args, context) {
    if (context.json) {
      throw new CliUsageError("[tw studio] --json is not supported for this command");
    }
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        project: { type: "string" },
        port: { type: "string" },
        mode: { type: "string" }
      }
    });
    const project = typeof parsed.values.project === "string" ? parsed.values.project : process.cwd();
    const port = typeof parsed.values.port === "string" ? parsed.values.port : "3030";
    const mode = typeof parsed.values.mode === "string" ? parsed.values.mode : "web";
    const script = await resolveScript(context, "scripts/v45/studio.mjs");
    await runCommand(
      process.execPath,
      [script, `--project=${project}`, `--port=${port}`, `--mode=${mode}`],
      {
        env: { ...process.env, PORT: port }
      }
    );
  }
};

// packages/cli/src/commands/sync.ts
init_errors();
var syncCommand = {
  name: "sync",
  async run(args, context) {
    const syncCmd = args[0];
    if (!syncCmd) {
      throw new CliUsageError("Usage: tw sync <init|pull|push|diff|figma>");
    }
    if (syncCmd === "figma") {
      const figmaAction = args[1];
      if (!figmaAction) {
        throw new CliUsageError(
          "Usage: tw sync figma <pull|push|diff|modes> [--file=KEY1,KEY2] [--mode=dark]"
        );
      }
      const isMulti = args.some(
        (value) => value.startsWith("--file=") || value.startsWith("--mode=") || value.startsWith("--from=") || figmaAction === "modes"
      );
      const script2 = await resolveScript(
        context,
        isMulti ? "scripts/v45/figma-multi.mjs" : "scripts/v45/figma-sync.mjs"
      );
      const commandArgs2 = [script2, figmaAction, ...args.slice(2)];
      if (context.json) {
        await runCommandAsJson(`sync.figma.${figmaAction}`, process.execPath, commandArgs2);
      } else {
        await runCommand(process.execPath, commandArgs2);
      }
      return;
    }
    const script = await resolveScript(context, "scripts/v45/sync.mjs");
    const commandArgs = [script, ...args];
    if (context.json) {
      await runCommandAsJson(`sync.${syncCmd}`, process.execPath, commandArgs);
    } else {
      await runCommand(process.execPath, commandArgs);
    }
  }
};

// packages/cli/src/commands/program.ts
function contextArgs(args, context) {
  return context.json ? [...args, "--json"] : args;
}
function leaf(commands, name) {
  const found = commands.find((command) => command.name === name);
  if (!found) {
    throw new Error(`Command definition not found: ${name}`);
  }
  return found;
}
function actionCommand(args) {
  return args[args.length - 1];
}
function toVariadic(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
function buildMainProgram(context) {
  new Map(miscCommands.map((command) => [command.name, command]));
  const scriptByName = new Map(scriptCommands.map((command) => [command.name, command]));
  const program2 = new Command("tw");
  program2.name("tw").description("tailwind-styled-v4 CLI").option("--json", "Output strict JSON envelope").option("--debug", "Include stack traces for errors").option("--verbose", "Verbose runtime logs");
  program2.command("setup").description("Auto-setup project").option("--yes", "Skip prompts").option("--next", "Force Next.js").option("--vite", "Force Vite").option("--rspack", "Force Rspack").option("--react", "Force React").option("--dry-run", "Preview changes").option("--skip-install", "Skip package install").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.yes) args.push("--yes");
    if (options.next) args.push("--next");
    if (options.vite) args.push("--vite");
    if (options.rspack) args.push("--rspack");
    if (options.react) args.push("--react");
    if (options.dryRun) args.push("--dry-run");
    if (options.skipInstall) args.push("--skip-install");
    await runSetupCli(contextArgs(args, context));
  }), program2.command("create [name]").description("Create project from template").option("-y, --yes", "Skip prompts").option("--template <template>", "Template name").option("--dry-run", "Preview generated files").action(async (name, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (name) args.push(name);
    if (options.template) args.push(`--template=${options.template}`);
    if (options.yes) args.push("--yes");
    if (options.dryRun) args.push("--dry-run");
    await createCommand2.run(contextArgs(args, context), context);
  });
  program2.command("init [target]").description("Initialize tailwind-styled config files").action(async (target) => {
    await runInitCli(contextArgs(target ? [target] : [], context));
  });
  program2.command("scan [target]").description("Scan classes in workspace").action(async (target) => {
    await runScanCli(contextArgs(target ? [target] : [], context));
  });
  program2.command("migrate [target]").description("Migrate project patterns to v4").option("--dry-run", "Preview changes").option("--wizard", "Use interactive wizard").action(async (target, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (target) args.push(target);
    if (options.dryRun) args.push("--dry-run");
    if (options.wizard) args.push("--wizard");
    await runMigrateCli(contextArgs(args, context));
  });
  program2.command("analyze [target]").description("Analyze class usage and patterns").action(async (target) => {
    await runAnalyzeCli(contextArgs(target ? [target] : [], context));
  });
  program2.command("stats [target]").description("Compute estimated CSS bundle stats").action(async (target) => {
    await runStatsCli(contextArgs(target ? [target] : [], context));
  });
  program2.command("extract [target]").description("Suggest extraction candidates").option("--min <count>", "Minimum repeat count").action(async (target, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (target) args.push(target);
    if (options.min) args.push(`--min=${options.min}`);
    await runExtractCli(contextArgs(args, context));
  });
  program2.command("preflight").description("Environment preflight checks").option("--fix", "Apply simple fixes").option("--allow-fail", "Do not set non-zero exit code on failing checks").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.fix) args.push("--fix");
    if (options.allowFail) args.push("--allow-fail");
    await preflightCommand.run(contextArgs(args, context), context);
  });
  program2.command("dashboard").description("Start dashboard server").option("--port <port>", "Dashboard port").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.port) args.push(`--port=${options.port}`);
    await dashboardCommand.run(args, context);
  });
  program2.command("storybook").description("Storybook helpers and variant matrix").option("--variants <json>", "Variant matrix JSON").option("--port <port>", "Storybook port").option("--no-open", "Disable browser open").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.variants) args.push(`--variants=${options.variants}`);
    if (options.port) args.push(`--port=${options.port}`);
    if (options.open === false) args.push("--no-open");
    await storybookCommand.run(contextArgs(args, context), context);
  });
  program2.command("studio").description("Open studio mode").option("--project <project>", "Project path").option("--port <port>", "Studio port").option("--mode <mode>", "Studio mode").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.project) args.push(`--project=${options.project}`);
    if (options.port) args.push(`--port=${options.port}`);
    if (options.mode) args.push(`--mode=${options.mode}`);
    await studioCommand.run(args, context);
  });
  program2.command("deploy [name]").description("Publish package metadata to registry").option("--version <version>", "Package version").option("--tag <tag>", "Publish tag").option("--registry <url>", "Target registry URL").option("--dry-run", "Preview manifest").action(async (name, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (name) args.push(name);
    if (options.version) args.push(`--version=${options.version}`);
    if (options.tag) args.push(`--tag=${options.tag}`);
    if (options.registry) args.push(`--registry=${options.registry}`);
    if (options.dryRun) args.push("--dry-run");
    await deployCommand.run(contextArgs(args, context), context);
  });
  const plugin = program2.command("plugin").description("Plugin discovery and install");
  plugin.command("search [query...]").description("Search plugins").action(async (query) => {
    await pluginCommand.run(["search", ...toVariadic(query)], context);
  });
  plugin.command("list").description("List available plugins").action(async () => {
    await pluginCommand.run(["list"], context);
  });
  plugin.command("install <name>").description("Install plugin package").action(async (name) => {
    await pluginCommand.run(["install", name], context);
  });
  plugin.command("verify <packageName>").description("Verify plugin package").action(async (packageName) => {
    await pluginCommand.run(contextArgs(["verify", packageName], context), context);
  });
  plugin.command("update-check").description("Check plugin updates").action(async () => {
    await pluginCommand.run(contextArgs(["update-check"], context), context);
  });
  plugin.command("marketplace [args...]").description("Marketplace helper").allowUnknownOption(true).action(async (args) => {
    await pluginCommand.run(contextArgs(["marketplace", ...toVariadic(args)], context), context);
  });
  plugin.command("publish [args...]").description("Publish plugin to marketplace").allowUnknownOption(true).action(async (args) => {
    await pluginCommand.run(contextArgs(["publish", ...toVariadic(args)], context), context);
  });
  const registry = program2.command("registry").description("Registry server utilities");
  ["serve", "list", "info", "publish", "install", "versions"].forEach((subcommand) => {
    registry.command(`${subcommand} [args...]`).description(`Registry ${subcommand}`).allowUnknownOption(true).action(async (args) => {
      await registryCommand.run(contextArgs([subcommand, ...toVariadic(args)], context), context);
    });
  });
  program2.command("install [args...]").description("Registry tarball install helper").allowUnknownOption(true).action(async (args) => {
    await installRegistryCommand.run(contextArgs(toVariadic(args), context), context);
  });
  const sync = program2.command("sync").description("Design token sync commands");
  ["init", "pull", "push", "diff"].forEach((subcommand) => {
    sync.command(`${subcommand} [args...]`).description(`Sync ${subcommand}`).allowUnknownOption(true).action(async (args) => {
      await syncCommand.run(contextArgs([subcommand, ...toVariadic(args)], context), context);
    });
  });
  const figma = sync.command("figma").description("Figma sync helpers");
  ["pull", "push", "diff", "modes"].forEach((subcommand) => {
    figma.command(`${subcommand} [args...]`).description(`Figma ${subcommand}`).allowUnknownOption(true).action(async (args) => {
      await syncCommand.run(
        contextArgs(["figma", subcommand, ...toVariadic(args)], context),
        context
      );
    });
  });
  program2.command("test").description("Test shortcut wrapper").option("--watch", "Watch mode").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.watch) args.push("--watch");
    await leaf(miscCommands, "test").run(args, context);
  });
  program2.command("ai <prompt...>").description("AI script shortcut").action(async (prompt) => {
    await leaf(miscCommands, "ai").run(prompt, context);
  });
  program2.command("share [name]").description("Generate share payload template").action(async (name) => {
    await leaf(miscCommands, "share").run(contextArgs(name ? [name] : [], context), context);
  });
  program2.command("code").description("VS Code extension helper").option("--docs", "Show docs URL").option("--install", "Install extension").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.docs) args.push("--docs");
    if (options.install) args.push("--install");
    await leaf(miscCommands, "code").run(contextArgs(args, context), context);
  });
  program2.command("version").alias("v").description("Show CLI version").option("--check", "Check latest npm version").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.check) args.push("--check");
    await leaf(miscCommands, "version").run(contextArgs(args, context), context);
  });
  program2.command("upgrade").alias("update").description("Check or upgrade CLI version").option("--install", "Install latest version globally").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.install) args.push("--install");
    await leaf(miscCommands, "upgrade").run(contextArgs(args, context), context);
  });
  program2.command("parse <file>").description("Parse file (prototype)").action(async (file) => {
    await scriptByName.get("parse").run(contextArgs([file], context), context);
  });
  program2.command("transform <file> [out]").description("Transform file (prototype)").option("--output <out>", "Output file").action(async (file, out, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [file];
    if (out) args.push(out);
    if (options.output) args.push(`--output=${options.output}`);
    await scriptByName.get("transform").run(contextArgs(args, context), context);
  });
  program2.command("minify <file>").description("Minify file (prototype)").action(async (file) => {
    await scriptByName.get("minify").run(contextArgs([file], context), context);
  });
  program2.command("shake <cssFile>").description("Shake CSS rules (prototype)").action(async (cssFile) => {
    await scriptByName.get("shake").run(contextArgs([cssFile], context), context);
  });
  program2.command("lint [dir] [workers]").description("Parallel lint helper (prototype)").action(async (dir, workers) => {
    const args = [dir ?? ".", workers ?? "0"];
    await scriptByName.get("lint").run(contextArgs(args, context), context);
  });
  program2.command("format <file>").description("Format helper (prototype)").option("--write", "Write file changes").action(async (file, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [file];
    if (options.write) args.push("--write");
    await scriptByName.get("format").run(contextArgs(args, context), context);
  });
  program2.command("lsp [args...]").description("Language server protocol helper").allowUnknownOption(true).action(async (args) => {
    await scriptByName.get("lsp").run(contextArgs(toVariadic(args), context), context);
  });
  program2.command("benchmark [args...]").description("Write benchmark snapshot").allowUnknownOption(true).action(async (args) => {
    await scriptByName.get("benchmark").run(contextArgs(toVariadic(args), context), context);
  });
  program2.command("optimize <file> [args...]").description("Compile-time optimize helper").allowUnknownOption(true).action(async (file, args) => {
    await scriptByName.get("optimize").run(contextArgs([file, ...toVariadic(args)], context), context);
  });
  program2.command("split [root] [outDir]").description("Route-based CSS split helper").option("--output <outDir>", "Output directory").action(async (root, outDir, ...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (root) args.push(root);
    if (outDir) args.push(outDir);
    if (options.output) args.push(`--output=${options.output}`);
    await scriptByName.get("split").run(contextArgs(args, context), context);
  });
  program2.command("critical <html> <css>").description("Critical CSS extraction helper").action(async (html, css) => {
    await scriptByName.get("critical").run(contextArgs([html, css], context), context);
  });
  ["cache", "cluster", "cluster-server", "adopt", "metrics", "audit"].forEach((name) => {
    const signature = name === "metrics" ? "metrics [port]" : name === "adopt" ? "adopt [feature] [project]" : `${name} [args...]`;
    program2.command(signature).description(`${name} helper`).allowUnknownOption(true).action(async (...actionArgs) => {
      const positionalArgs = actionArgs.slice(0, -1).flatMap((value) => Array.isArray(value) ? value : value ? [String(value)] : []);
      await scriptByName.get(name).run(contextArgs(positionalArgs, context), context);
    });
  });
  program2.command("help [topic...]").description("Show help").action(async (topic) => {
    context.output.writeText(resolveCommandHelp(program2, toVariadic(topic)).trim());
  });
  program2.command("trace <class>").description("Trace why a class behaves the way it does").aliases(["t"]).action(async (className) => {
    await runTraceCli([className], context);
  });
  program2.command("doctor").description("Run diagnostics on your codebase").aliases(["d", "diagnose"]).option("--verbose", "Show detailed diagnostics").action(async (...actionArgs) => {
    const options = actionCommand(actionArgs).opts();
    const args = [];
    if (options.verbose) args.push("--verbose");
    await runDoctorCli(args, context);
  });
  program2.command("why <class>").description("Explain why a class is in the bundle").aliases(["w"]).action(async (className) => {
    await runWhyCli([className], context);
  });
  return program2;
}

// packages/cli/src/index.ts
init_runtime();
async function main2() {
  await runCliMain({
    importMetaUrl: import.meta.url,
    buildProgram: buildMainProgram
  });
}
main2();
//# sourceMappingURL=cli.mjs.map
//# sourceMappingURL=cli.mjs.map