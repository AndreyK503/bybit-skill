"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports2) {
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
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports2) {
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
        if (this._name.endsWith("...")) {
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
      _collectValue(value2, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value2];
        }
        previous.push(value2);
        return previous;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value2, description) {
        this.defaultValue = value2;
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
            return this._collectValue(arg, previous);
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
    exports2.Argument = Argument2;
    exports2.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports2) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.minWidthToWrap = 40;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
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
          return Math.max(
            max,
            this.displayWidth(
              helper.styleSubcommandTerm(helper.subcommandTerm(command))
            )
          );
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
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
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
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
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
          return Math.max(
            max,
            this.displayWidth(
              helper.styleArgumentTerm(helper.argumentTerm(argument))
            )
          );
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
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (option.description) {
            return `${option.description} ${extraDescription}`;
          }
          return extraDescription;
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
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return argument.description;
      }
      /**
       * Format a list of items, given a heading and an array of formatted items.
       *
       * @param {string} heading
       * @param {string[]} items
       * @param {Help} helper
       * @returns string[]
       */
      formatItemList(heading, items, helper) {
        if (items.length === 0) return [];
        return [helper.styleTitle(heading), ...items, ""];
      }
      /**
       * Group items by their help group heading.
       *
       * @param {Command[] | Option[]} unsortedItems
       * @param {Command[] | Option[]} visibleItems
       * @param {Function} getGroup
       * @returns {Map<string, Command[] | Option[]>}
       */
      groupItems(unsortedItems, visibleItems, getGroup) {
        const result = /* @__PURE__ */ new Map();
        unsortedItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) result.set(group, []);
        });
        visibleItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) {
            result.set(group, []);
          }
          result.get(group).push(item);
        });
        return result;
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
        const helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.boxWrap(
              helper.styleCommandDescription(commandDescription),
              helpWidth
            ),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return callFormatItem(
            helper.styleArgumentTerm(helper.argumentTerm(argument)),
            helper.styleArgumentDescription(helper.argumentDescription(argument))
          );
        });
        output = output.concat(
          this.formatItemList("Arguments:", argumentList, helper)
        );
        const optionGroups = this.groupItems(
          cmd.options,
          helper.visibleOptions(cmd),
          (option) => option.helpGroupHeading ?? "Options:"
        );
        optionGroups.forEach((options, group) => {
          const optionList = options.map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(this.formatItemList(group, optionList, helper));
        });
        if (helper.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(
            this.formatItemList("Global Options:", globalOptionList, helper)
          );
        }
        const commandGroups = this.groupItems(
          cmd.commands,
          helper.visibleCommands(cmd),
          (sub) => sub.helpGroup() || "Commands:"
        );
        commandGroups.forEach((commands, group) => {
          const commandList = commands.map((sub) => {
            return callFormatItem(
              helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
              helper.styleSubcommandDescription(helper.subcommandDescription(sub))
            );
          });
          output = output.concat(this.formatItemList(group, commandList, helper));
        });
        return output.join("\n");
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str) {
        return stripColor(str).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str) {
        return str;
      }
      styleUsage(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word === "[command]") return this.styleSubcommandText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleCommandText(word);
        }).join(" ");
      }
      styleCommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleOptionDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleSubcommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleArgumentDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleDescriptionText(str) {
        return str;
      }
      styleOptionTerm(str) {
        return this.styleOptionText(str);
      }
      styleSubcommandTerm(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleSubcommandText(word);
        }).join(" ");
      }
      styleArgumentTerm(str) {
        return this.styleArgumentText(str);
      }
      styleOptionText(str) {
        return str;
      }
      styleArgumentText(str) {
        return str;
      }
      styleSubcommandText(str) {
        return str;
      }
      styleCommandText(str) {
        return str;
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
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str) {
        return /\n[^\S\r\n]/.test(str);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        const itemIndent = 2;
        const itemIndentStr = " ".repeat(itemIndent);
        if (!description) return itemIndentStr + term;
        const paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        );
        const spacerWidth = 2;
        const helpWidth = this.helpWidth ?? 80;
        const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
        let formattedDescription;
        if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
          formattedDescription = description;
        } else {
          const wrappedDescription = helper.boxWrap(description, remainingWidth);
          formattedDescription = wrappedDescription.replace(
            /\n/g,
            "\n" + " ".repeat(termWidth + spacerWidth)
          );
        }
        return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str, width) {
        if (width < this.minWidthToWrap) return str;
        const rawLines = str.split(/\r\n|\n/);
        const chunkPattern = /[\s]*[^\s]+/g;
        const wrappedLines = [];
        rawLines.forEach((line) => {
          const chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()];
          let sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            const visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width) {
              sumChunks.push(chunk);
              sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            const nextChunk = chunk.trimStart();
            sumChunks = [nextChunk];
            sumWidth = this.displayWidth(nextChunk);
          });
          wrappedLines.push(sumChunks.join(""));
        });
        return wrappedLines.join("\n");
      }
    };
    function stripColor(str) {
      const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str.replace(sgrPattern, "");
    }
    exports2.Help = Help2;
    exports2.stripColor = stripColor;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports2) {
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
        this.helpGroupHeading = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value2, description) {
        this.defaultValue = value2;
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
      _collectValue(value2, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value2];
        }
        previous.push(value2);
        return previous;
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
            return this._collectValue(arg, previous);
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
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        if (this.negate) {
          return camelcase(this.name().replace(/^no-/, ""));
        }
        return camelcase(this.name());
      }
      /**
       * Set the help group heading.
       *
       * @param {string} heading
       * @return {Option}
       */
      helpGroup(heading) {
        this.helpGroupHeading = heading;
        return this;
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
        this.negativeOptions.forEach((value2, key) => {
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
      valueFromOption(value2, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value2);
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
      const shortFlagExp = /^-[^-]$/;
      const longFlagExp = /^--[^-]/;
      const flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
      if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
      if (!shortFlag && shortFlagExp.test(flagParts[0]))
        shortFlag = flagParts.shift();
      if (!shortFlag && longFlagExp.test(flagParts[0])) {
        shortFlag = longFlag;
        longFlag = flagParts.shift();
      }
      if (flagParts[0].startsWith("-")) {
        const unsupportedFlag = flagParts[0];
        const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        if (/^-[^-][^-]/.test(unsupportedFlag))
          throw new Error(
            `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
          );
        if (shortFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many short flags`);
        if (longFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many long flags`);
        throw new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports2.Option = Option2;
    exports2.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports2) {
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
    exports2.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports2) {
    var EventEmitter = require("node:events").EventEmitter;
    var childProcess = require("node:child_process");
    var path4 = require("node:path");
    var fs2 = require("node:fs");
    var process2 = require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2, stripColor } = require_help();
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
        this._allowExcessArguments = false;
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
        this._savedState = null;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          outputError: (str, write) => write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
          stripColor: (str) => stripColor(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
        this._helpGroupHeading = void 0;
        this._defaultCommandGroup = void 0;
        this._defaultOptionGroup = void 0;
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
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        this._outputConfiguration = {
          ...this._outputConfiguration,
          ...configuration
        };
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
       * @param {(Function|*)} [parseArg] - custom argument processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, parseArg, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof parseArg === "function") {
          argument.default(defaultValue).argParser(parseArg);
        } else {
          argument.default(parseArg);
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
        if (previousArgument?.variadic) {
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
          if (enableOrNameAndArgs && this._defaultCommandGroup) {
            this._initCommandGroup(this._getHelpCommand());
          }
          return this;
        }
        const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
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
        this._initCommandGroup(helpCommand);
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
            } else {
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
      _callParseArg(target, value2, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value2, previous);
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
        this._initOptionGroup(option);
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
        this._initCommandGroup(command);
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
            val = option._collectValue(val, oldValue);
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
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
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
      setOptionValue(key, value2) {
        return this.setOptionValueWithSource(key, value2, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value2, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value2;
        } else {
          this._optionValues[key] = value2;
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
        this._prepareForParse();
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
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      _prepareForParse() {
        if (this._savedState === null) {
          this.saveStateBeforeParse();
        } else {
          this.restoreStateBeforeParse();
        }
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name;
        this._scriptPath = null;
        this.rawArgs = [];
        this._optionValues = { ...this._savedState._optionValues };
        this._optionValueSources = { ...this._savedState._optionValueSources };
        this.args = [];
        this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs2.existsSync(executableFile)) return;
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
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
          const localBin = path4.resolve(baseDir, baseName);
          if (fs2.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path4.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs2.existsSync(`${localBin}${ext}`)
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
            resolvedScriptPath = fs2.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path4.resolve(
            path4.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path4.basename(
              this._scriptPath,
              path4.extname(this._scriptPath)
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
        launchWithNode = sourceExt.includes(path4.extname(executableFile));
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
          this._checkForMissingExecutable(
            executableFile,
            executableDir,
            subcommand._name
          );
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
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
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
        subCommand._prepareForParse();
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
        const myParseArg = (argument, value2, previous) => {
          let parsedValue = value2;
          if (value2 !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value2}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value2,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value2 = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value2 = this.args.slice(index);
              if (declaredArg.parseArg) {
                value2 = value2.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value2 === void 0) {
              value2 = [];
            }
          } else if (index < this.args.length) {
            value2 = this.args[index];
            if (declaredArg.parseArg) {
              value2 = myParseArg(declaredArg, value2, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value2;
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
        if (promise?.then && typeof promise.then === "function") {
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
        if (this.parent?.listenerCount(commandEvent)) {
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
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} args
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(args) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        const negativeNumberArg = (arg) => {
          if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
          return !this._getCommandAndAncestors().some(
            (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
          );
        };
        let activeVariadicOption = null;
        let activeGroup = null;
        let i = 0;
        while (i < args.length || activeGroup) {
          const arg = activeGroup ?? args[i++];
          activeGroup = null;
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args.slice(i));
            break;
          }
          if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value2 = args[i++];
                if (value2 === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value2);
              } else if (option.optional) {
                let value2 = null;
                if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
                  value2 = args[i++];
                }
                this.emit(`option:${option.name()}`, value2);
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
                activeGroup = `-${arg.slice(2)}`;
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
          if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              unknown.push(...args.slice(i));
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg, ...args.slice(i));
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg, ...args.slice(i));
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg, ...args.slice(i));
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
       * Set/get the help group heading for this subcommand in parent command's help.
       *
       * @param {string} [heading]
       * @return {Command | string}
       */
      helpGroup(heading) {
        if (heading === void 0) return this._helpGroupHeading ?? "";
        this._helpGroupHeading = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for subcommands added to this command.
       * (This does not override a group set directly on the subcommand using .helpGroup().)
       *
       * @example
       * program.commandsGroup('Development Commands:);
       * program.command('watch')...
       * program.command('lint')...
       * ...
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      commandsGroup(heading) {
        if (heading === void 0) return this._defaultCommandGroup ?? "";
        this._defaultCommandGroup = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for options added to this command.
       * (This does not override a group set directly on the option using .helpGroup().)
       *
       * @example
       * program
       *   .optionsGroup('Development Options:')
       *   .option('-d, --debug', 'output extra debugging')
       *   .option('-p, --profile', 'output profiling information')
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      optionsGroup(heading) {
        if (heading === void 0) return this._defaultOptionGroup ?? "";
        this._defaultOptionGroup = heading;
        return this;
      }
      /**
       * @param {Option} option
       * @private
       */
      _initOptionGroup(option) {
        if (this._defaultOptionGroup && !option.helpGroupHeading)
          option.helpGroup(this._defaultOptionGroup);
      }
      /**
       * @param {Command} cmd
       * @private
       */
      _initCommandGroup(cmd) {
        if (this._defaultCommandGroup && !cmd.helpGroup())
          cmd.helpGroup(this._defaultCommandGroup);
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
        this._name = path4.basename(filename, path4.extname(filename));
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
      executableDir(path5) {
        if (path5 === void 0) return this._executableDir;
        this._executableDir = path5;
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
        const context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        const text = helper.formatHelp(this, helper);
        if (context.hasColors) return text;
        return this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        const error = !!contextOptions.error;
        let baseWrite;
        let hasColors;
        let helpWidth;
        if (error) {
          baseWrite = (str) => this._outputConfiguration.writeErr(str);
          hasColors = this._outputConfiguration.getErrHasColors();
          helpWidth = this._outputConfiguration.getErrHelpWidth();
        } else {
          baseWrite = (str) => this._outputConfiguration.writeOut(str);
          hasColors = this._outputConfiguration.getOutHasColors();
          helpWidth = this._outputConfiguration.getOutHelpWidth();
        }
        const write = (str) => {
          if (!hasColors) str = this._outputConfiguration.stripColor(str);
          return baseWrite(str);
        };
        return { error, write, hasColors, helpWidth };
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
        const outputContext = this._getOutputContext(contextOptions);
        const eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
        this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        outputContext.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", eventContext);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", eventContext)
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
            if (this._helpOption === null) this._helpOption = void 0;
            if (this._defaultOptionGroup) {
              this._initOptionGroup(this._getHelpOption());
            }
          } else {
            this._helpOption = null;
          }
          return this;
        }
        this._helpOption = this.createOption(
          flags ?? "-h, --help",
          description ?? "display help for command"
        );
        if (flags || description) this._initOptionGroup(this._helpOption);
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
        this._initOptionGroup(option);
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
        let exitCode = Number(process2.exitCode ?? 0);
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
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
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
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
    function useColor() {
      if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
        return false;
      if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== void 0)
        return true;
      return void 0;
    }
    exports2.Command = Command2;
    exports2.useColor = useColor;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports2) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports2.program = new Command2();
    exports2.createCommand = (name) => new Command2(name);
    exports2.createOption = (flags, description) => new Option2(flags, description);
    exports2.createArgument = (name, description) => new Argument2(name, description);
    exports2.Command = Command2;
    exports2.Option = Option2;
    exports2.Argument = Argument2;
    exports2.Help = Help2;
    exports2.CommanderError = CommanderError2;
    exports2.InvalidArgumentError = InvalidArgumentError2;
    exports2.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/dotenv/dist/index.cjs
var require_dist = __commonJS({
  "node_modules/dotenv/dist/index.cjs"(exports2, module2) {
    var I = (e, o) => () => {
      try {
        return o || e((o = { exports: {} }).exports, o), o.exports;
      } catch (t) {
        throw o = 0, t;
      }
    };
    var S = I((xe, U) => {
      function G(e) {
        return typeof e == "string" ? !["false", "0", "no", "off", ""].includes(e.toLowerCase()) : !!e;
      }
      function X(e = process.env) {
        let o = {};
        for (let t of ["ENCODING", "PATH", "QUIET", "DEBUG", "OVERRIDE", "FAST"]) {
          let n = e[`DOTENV_${t}`] != null ? e[`DOTENV_${t}`] : e[`DOTENV_CONFIG_${t}`];
          n != null && (o[t.toLowerCase()] = t === "ENCODING" || t === "PATH" ? n : G(n));
        }
        return o;
      }
      U.exports = { parseBoolean: G, optionsFromEnv: X };
    });
    var N = I((ye, x) => {
      var Y = require("fs"), j = require("path"), z = require("os"), { URL: Z, fileURLToPath: ee } = require("url"), { parseBoolean: k, optionsFromEnv: B } = S(), te = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg, b = new Uint8Array(256);
      for (let e = 48; e <= 57; e++) b[e] = 1;
      for (let e = 65; e <= 90; e++) b[e] = 1;
      for (let e = 97; e <= 122; e++) b[e] = 1;
      b[45] = 1;
      b[46] = 1;
      b[95] = 1;
      function re(e) {
        let o = {}, t = e.toString();
        t = t.replace(/\r\n?/mg, `
`);
        let n;
        for (; (n = te.exec(t)) != null; ) {
          let r = n[1], s = n[2] || "";
          s = s.trim();
          let i = s[0];
          s = s.replace(/^(['"`])([\s\S]*)\1$/mg, "$2"), i === '"' && (s = s.replace(/\\n/g, `
`), s = s.replace(/\\r/g, "\r")), o[r] = s;
        }
        return o;
      }
      function w(e) {
        return e <= 32 ? e === 32 || e >= 9 && e <= 13 : e >= 160 && (e === 160 || e === 5760 || e >= 8192 && e <= 8202 || e === 8232 || e === 8233 || e === 8239 || e === 8287 || e === 12288 || e === 65279);
      }
      function O(e) {
        return e === 10 || e === 8232 || e === 8233;
      }
      function oe(e) {
        let o = {}, t = typeof e == "string" ? e : e.toString();
        t.indexOf("\r") !== -1 && (t = t.replace(/\r\n?/g, `
`));
        let n = t.length, r = 0;
        for (; r < n; ) {
          let s = t.charCodeAt(r);
          for (; r < n && w(s); ) r++, s = t.charCodeAt(r);
          if (r >= n) break;
          if (s === 35) {
            for (; r < n && !O(t.charCodeAt(r)); ) r++;
            continue;
          }
          let i = -1;
          if (s === 101 && r + 6 < n && t.charCodeAt(r + 1) === 120 && t.charCodeAt(r + 2) === 112 && t.charCodeAt(r + 3) === 111 && t.charCodeAt(r + 4) === 114 && t.charCodeAt(r + 5) === 116) {
            let C = t.charCodeAt(r + 6);
            if (w(C)) {
              let d = r + 7;
              for (; d < n && w(t.charCodeAt(d)); ) d++;
              b[t.charCodeAt(d)] && (i = r + 6, r = d);
            } else s = t.charCodeAt(r);
          }
          let l = r, u = 0;
          for (; r < n && (u = t.charCodeAt(r), b[u]); ) r++;
          if (r === l) {
            for (; r < n && !O(t.charCodeAt(r)); ) r++;
            continue;
          }
          let p = t.slice(l, r), f = r;
          if (r >= n && (u = 0), w(u)) do
            r++, u = r < n ? t.charCodeAt(r) : 0;
          while (w(u));
          if (u === 61) r++;
          else if (u === 58 && r === f && r + 1 < n && w(t.charCodeAt(r + 1))) r += 2;
          else {
            for (r = i === -1 ? f : i; r < n && !O(t.charCodeAt(r)); ) r++;
            continue;
          }
          let c = r, a = r;
          for (; a < n && w(t.charCodeAt(a)); ) a++;
          let g = t.charCodeAt(a), h, y = false;
          if (g === 39 || g === 34 || g === 96) {
            let C = t[a], d = t.indexOf(C, a + 1), m = -1, v = -1;
            for (; d !== -1; ) {
              let q = t.charCodeAt(d - 1) === 92, A = d + 1;
              for (; A < n && !O(t.charCodeAt(A)) && w(t.charCodeAt(A)); ) A++;
              if ((A === n || O(t.charCodeAt(A)) || t.charCodeAt(A) === 35) && (m = d, v = A), !q) break;
              d = t.indexOf(C, d + 1);
            }
            if (m !== -1) {
              if (h = t.slice(a + 1, m), r = v, t.charCodeAt(r) === 35) for (; r < n && !O(t.charCodeAt(r)); ) r++;
              y = true;
            }
          }
          if (!y) {
            let C = t.indexOf(`
`, c);
            C === -1 && (C = n);
            let d = t.indexOf("#", c);
            (d === -1 || d > C) && (d = C);
            let m = c, v = d;
            for (; m < v && w(t.charCodeAt(m)); ) m++;
            for (; v > m && w(t.charCodeAt(v - 1)); ) v--;
            let q = t.charCodeAt(m);
            if (v - m >= 2 && (q === 39 || q === 34 || q === 96) && t.charCodeAt(v - 1) === q ? h = t.slice(m + 1, v - 1) : h = t.slice(m, v), r = d, d < C) for (; r < n && !O(t.charCodeAt(r)); ) r++;
          }
          g === 34 && (y || a < r) && h.indexOf("\\") !== -1 && (h = h.replace(/\\n/g, `
`).replace(/\\r/g, "\r")), o[p] = h;
        }
        return o;
      }
      function ne(e, o) {
        return o && k(o.fast) ? oe(e) : re(e);
      }
      function T(e) {
        console.log(`┆ ${e}`);
      }
      function se(e) {
        console.error(`◇ ${e}`);
      }
      function V(e) {
        return e[0] === "~" ? j.join(z.homedir(), e.slice(1)) : e;
      }
      function ie(e = {}) {
        return { ...B(), ...e };
      }
      function ce(e) {
        e = ie(e);
        let o = j.resolve(process.cwd(), ".env"), t = "utf8", n = process.env;
        e && e.processEnv != null && (n = e.processEnv);
        let r = k(e && e.debug);
        e && e.encoding ? t = e.encoding : r && T("no encoding is specified (UTF-8 is used by default)");
        let s = [o];
        if (e && e.path) if (!Array.isArray(e.path)) s = [V(e.path)];
        else {
          s = [];
          for (let c of e.path) s.push(V(c));
        }
        let i, l = {}, u = { fast: e.fast };
        for (let c of s) try {
          let a = E.parse(Y.readFileSync(c, { encoding: t }), u);
          E.populate(l, a, e);
        } catch (a) {
          r && T(`failed to load ${c} ${a.message}`), i = a;
        }
        let p = E.populate(n, l, e), f = k(Object.prototype.hasOwnProperty.call(e, "quiet") ? e.quiet : B(n).quiet);
        if (r || !f) {
          let c = Object.keys(p).length, a = [];
          for (let g of s) try {
            let h = j.relative(process.cwd(), g instanceof Z ? ee(g) : g);
            a.push(h);
          } catch (h) {
            r && T(`failed to load ${g} ${h.message}`), i = h;
          }
          se(`injected env (${c}) from ${a.join(",")}`);
        }
        return i ? { parsed: l, error: i } : { parsed: l };
      }
      function ae(e) {
        return E.configDotenv(e);
      }
      function le(e, o, t = {}) {
        let n = !!(t && t.debug), r = !!(t && t.override), s = {};
        if (e === null || typeof e != "object" || o === null || typeof o != "object") {
          let i = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
          throw i.code = "OBJECT_REQUIRED", i;
        }
        for (let i of Object.keys(o)) Object.prototype.hasOwnProperty.call(e, i) ? (r === true && (e[i] = o[i], s[i] = o[i]), n && T(r === true ? `"${i}" is already defined and WAS overwritten` : `"${i}" is already defined and was NOT overwritten`)) : (e[i] = o[i], s[i] = o[i]);
        return s;
      }
      var E = { configDotenv: ce, config: ae, parse: ne, populate: le };
      x.exports.configDotenv = E.configDotenv;
      x.exports.config = E.config;
      x.exports.parse = E.parse;
      x.exports.populate = E.populate;
      x.exports = E;
    });
    var M = I((Te, W) => {
      var _ = require("child_process"), fe = require("fs"), L = require("path");
      function ue(e) {
        let o = ['"'], t = 0;
        for (let n of e) {
          if (n === "\\") {
            t++;
            continue;
          }
          n === '"' ? o.push("\\".repeat(t * 2 + 1), '"') : o.push("\\".repeat(t), n), t = 0;
        }
        return o.push("\\".repeat(t * 2), '"'), o.join("");
      }
      function H(e, o = 1) {
        for (let t = 0; t < o; t++) {
          let n = [];
          for (let r of e) {
            let s = r.charCodeAt(0), i = s >= 48 && s <= 57 || s >= 65 && s <= 90 || s >= 97 && s <= 122, l = "\\/:._-".includes(r);
            !i && !l && s < 128 && n.push("^"), n.push(r);
          }
          e = n.join("");
        }
        return e;
      }
      function P(e, o) {
        let t = Object.keys(e).reverse().find((n) => n.toUpperCase() === o);
        return t === void 0 ? void 0 : e[t];
      }
      function de(e, o, t) {
        let n = (P(o, "PATHEXT") || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean), s = n.some((l) => e.toLowerCase().endsWith(l.toLowerCase())) ? ["", ...n] : [...n, ""], i = /[\\/]/.test(e) ? [t] : [t, ...(P(o, "PATH") || "").split(";")];
        for (let l of i) for (let u of s) {
          let p = L.resolve(t, l.replace(/^"|"$/g, ""), e + u);
          try {
            if (fe.statSync(p).isFile()) return p;
          } catch {
          }
        }
      }
      function pe(e, o, t) {
        if (process.platform !== "win32") return _.spawn(e, o, t);
        let n = t.env || process.env, r = de(e, n, t.cwd || process.cwd());
        if (r && /\.(?:exe|com)$/i.test(r)) return _.spawn(r, o, t);
        let s = /\.(?:bat|cmd)$/i.test(r || e), i = [H(L.normalize(r || e))];
        for (let u of o) i.push(H(ue(u), s ? 2 : 1));
        let l = i.join(" ");
        return _.spawn(P(n, "COMSPEC") || "cmd.exe", ["/d", "/v:off", "/s", "/c", `"${l}"`], { ...t, windowsVerbatimArguments: true });
      }
      W.exports = pe;
    });
    var K = I(($e, F) => {
      var he = require("fs"), ge = require("os"), Q = require("path"), me = require("child_process"), ve = M(), R = N(), { optionsFromEnv: Ce } = S();
      function $() {
        console.log(["Usage: dotenv run [--help] [-q|--quiet] [--debug] [--override] [--fast] [-f|--file <paths>] [--] <command> [args...]", "", "Run a command with environment variables from a .env file.", "Place dotenv options before the command; all following arguments go to the command.", "", "Options:", "  -f, --file <paths>  .env paths, comma-separated or repeated (default: .env)", "  -q, --quiet suppress the injected env message", "  --debug     enable debug logging", "  --override  override existing environment variables", "  --fast      use the faster character-scanner parser", "", "Environment variables (DOTENV_CONFIG_* names remain as fallbacks):", "  DOTENV_PATH, DOTENV_ENCODING, DOTENV_QUIET,", "  DOTENV_DEBUG, DOTENV_OVERRIDE,", "  DOTENV_FAST"].join(`
`));
      }
      function we(e) {
        let o = [], t = false, n, r, s, i, l = -1;
        for (let p = 0; p < e.length; p++) {
          let f = e[p];
          if (f === "--") {
            l = p + 1;
            break;
          }
          if (f === "--help" || f === "-h") return { help: true };
          if (f === "--quiet" || f === "-q") {
            n = true;
            continue;
          }
          if (f === "--debug") {
            r = true;
            continue;
          }
          if (f === "--override") {
            s = true;
            continue;
          }
          if (f === "--fast") {
            i = true;
            continue;
          }
          if (f === "-f" || f === "--file" || f.startsWith("-f=") || f.startsWith("--file=")) {
            let c = f.indexOf("="), a = c === -1 ? f : f.slice(0, c), g = c === -1 ? e[++p] : f.slice(c + 1);
            if (!g || g === "--") return { error: `${a} requires a path` };
            let h = g.split(",").map((y) => y.trim()).filter(Boolean);
            if (h.length === 0) return { error: `${a} requires a path` };
            o.push(...h), t = true;
            continue;
          }
          if (f.startsWith("-")) return { error: `unknown option: ${f}` };
          l = p;
          break;
        }
        let u = l === -1 ? [] : e.slice(l);
        return { paths: o, pathSet: t, quiet: n, debug: r, override: s, fast: i, command: u };
      }
      function Ee(e) {
        return e[0] === "~" ? Q.join(ge.homedir(), e.slice(1)) : e;
      }
      function Ae(e) {
        let o = Ce(), t = { encoding: o.encoding || "utf8", quiet: o.quiet === true, debug: o.debug === true, override: o.override === true, fast: o.fast === true, paths: [".env"], defaultPath: true };
        return o.path != null && (t.paths = [o.path], t.defaultPath = false), e.pathSet && (t.paths = e.paths, t.defaultPath = false), e.quiet != null && (t.quiet = e.quiet), e.debug != null && (t.debug = e.debug), e.override != null && (t.override = e.override), e.fast != null && (t.fast = e.fast), t;
      }
      function be(e) {
        let o = {}, t = [], n = { override: e.override, debug: e.debug };
        for (let s of e.paths) {
          let i = Q.resolve(process.cwd(), Ee(s));
          try {
            let l = R.parse(he.readFileSync(i, { encoding: e.encoding }), { fast: e.fast });
            R.populate(o, l, n), t.push(s);
          } catch (l) {
            if (e.debug && console.log(`┆ failed to load ${s} ${l.message}`), !(e.defaultPath && l.code === "ENOENT")) throw l;
          }
        }
        return { injected: R.populate(process.env, o, n), loadedPaths: t };
      }
      function J(e) {
        let o = e[0];
        if (o === "--help" || o === "-h") {
          $();
          return;
        }
        if (o !== "run") {
          $(), process.exitCode = 1;
          return;
        }
        let t = we(e.slice(1));
        if (t.help) {
          $();
          return;
        }
        if (t.error) {
          console.error(`dotenv: ${t.error}`), $(), process.exitCode = 1;
          return;
        }
        if (t.command.length === 0) {
          $(), process.exitCode = 1;
          return;
        }
        let n = Ae(t);
        try {
          let c = be(n);
          if (!n.quiet) {
            let a = `◇ injected env (${Object.keys(c.injected).length})`;
            c.loadedPaths.length > 0 && (a += ` from ${c.loadedPaths.join(", ")}`), console.error(a);
          }
        } catch (c) {
          console.error(`dotenv: ${c.message}`), process.exitCode = 1;
          return;
        }
        let r = !!process.stdin.isTTY, s = process.platform !== "win32" && !r, i = ve(t.command[0], t.command.slice(1), { stdio: "inherit", detached: s }), l = /* @__PURE__ */ new Map(), u = 0;
        function p(c) {
          if (!(!i.pid || i.exitCode !== null || i.signalCode !== null)) {
            if (process.platform === "win32") {
              me.spawnSync("taskkill", ["/pid", String(i.pid), "/T", "/F"], { stdio: "ignore" });
              return;
            }
            try {
              process.kill(s ? -i.pid : i.pid, c);
            } catch (a) {
              if (a.code !== "ESRCH") throw a;
            }
          }
        }
        function f() {
          for (let [c, a] of l) process.removeListener(c, a);
        }
        for (let c of ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"]) {
          let a = () => {
            if (c === "SIGINT") {
              if (u++, r && process.platform !== "win32" && u === 1) return;
              if (u > 1) {
                p(u === 2 ? "SIGTERM" : "SIGKILL");
                return;
              }
            }
            p(c);
          };
          l.set(c, a), process.on(c, a);
        }
        i.on("error", function(c) {
          f(), console.error(`dotenv: ${c.message}`), process.exitCode = 1;
        }), i.on("exit", function(c, a) {
          f(), typeof c == "number" ? process.exit(c) : (setInterval(() => {
          }, 1e3), process.kill(process.pid, a));
        });
      }
      F.exports = J;
      require.main === F && J(process.argv.slice(2));
    });
    var D = N();
    var Oe = K();
    module2.exports = D;
    module2.exports.config = D.config;
    module2.exports.configDotenv = D.configDotenv;
    module2.exports.parse = D.parse;
    module2.exports.populate = D.populate;
    require.main === module2 && Oe(process.argv.slice(2));
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/config/config.ts
var import_dotenv = __toESM(require_dist(), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// src/api/errors.ts
var AppError = class extends Error {
  code;
  userMessage;
  details;
  constructor(params) {
    super(`${params.code}: ${params.userMessage}`, { cause: params.cause });
    this.name = "AppError";
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.details = params.details;
  }
};

// src/config/config.ts
var ENV_PATH = import_node_path.default.join(import_node_os.default.homedir(), ".config", "bybit", ".env");
var CACHE_DIR = import_node_path.default.join(import_node_os.default.homedir(), ".config", "bybit", "cache");
var DEFAULT_BASE_URL = "https://api.bybit.com";
var ALLOWED_BASE_URLS = [
  "https://api.bybit.com",
  "https://api.bytick.com",
  "https://api.bybit.tr",
  "https://api.bybit.kz",
  "https://api.bybitgeorgia.ge",
  "https://api.bybit.ae",
  "https://api.bybit.eu",
  "https://api.bybit.id"
];
var RECV_WINDOW_MS = 5e3;
var REQUEST_TIMEOUT_MS = 3e4;
var CLOCK_SKEW_WARN_MS = 1e3;
function loadEnvFile(file, env) {
  import_dotenv.default.config({ path: file, processEnv: env, quiet: true });
}
function loadCredentials(env) {
  const credentials = readCredentials(env);
  if (!credentials) throw keyMissingError();
  return credentials;
}
function readCredentials(env) {
  const apiKey = env.BYBIT_API_KEY;
  const apiSecret = env.BYBIT_API_SECRET;
  if (!apiKey || !apiSecret) return void 0;
  if (!PRINTABLE.test(apiKey) || !PRINTABLE.test(apiSecret)) throw keyMalformedError();
  return { apiKey, apiSecret };
}
var PRINTABLE = /^[\x21\x23-\x26\x28-\x7E]+$/;
function keyMalformedError() {
  return new AppError({
    code: "APP_KEY_MALFORMED",
    userMessage: `BYBIT_API_KEY или BYBIT_API_SECRET содержит пробел, кавычку, перевод строки или другой недопустимый символ. Проверьте строки в ${ENV_PATH}: значение без кавычек и пробелов, как оно скопировано с Bybit.`
  });
}
function keyMissingError() {
  return new AppError({
    code: "APP_KEY_MISSING",
    userMessage: `Ключ API не настроен. Создайте на Bybit ключ только на чтение (Read-Only) и запишите в ${ENV_PATH} строки BYBIT_API_KEY=<ключ> и BYBIT_API_SECRET=<секрет>.`
  });
}
function resolveBaseUrl(env) {
  const url = env.BYBIT_BASE_URL;
  if (!url) return DEFAULT_BASE_URL;
  if (ALLOWED_BASE_URLS.includes(url)) return url;
  throw new AppError({
    code: "APP_CONFIG_INVALID",
    userMessage: `BYBIT_BASE_URL=${url} не поддерживается. Допустимые адреса основной сети: ${ALLOWED_BASE_URLS.join(", ")}.`
  });
}

// src/api/error-map.ts
var KIND = {
  keyRejected: () => new AppError({
    code: "APP_KEY_REJECTED",
    userMessage: "Биржа не приняла ключ API: он неверный, отозван или истёк, либо секрет не соответствует ключу. Проверьте BYBIT_API_KEY и BYBIT_API_SECRET или пересоздайте ключ только на чтение."
  }),
  ipMismatch: () => new AppError({
    code: "APP_KEY_IP_MISMATCH",
    userMessage: "Ключ API привязан к другим IP-адресам. Добавьте текущий IP в настройках ключа на Bybit или снимите привязку."
  }),
  permissionDenied: (path4) => new AppError({
    code: "APP_PERMISSION_DENIED",
    userMessage: `У ключа API нет права на запрос ${path4}. Биржа не сообщает, какое право нужно: сверьте права ключа (session status) с разделом данных и добавьте нужное право на чтение.`
  }),
  regionBlocked: () => new AppError({
    code: "APP_REGION_BLOCKED",
    userMessage: "Биржа не обслуживает запросы с этого адреса: доступ ограничен для вашего региона (в том числе США и материковый Китай)."
  }),
  rateLimit: (resetTimestamp) => new AppError({
    code: "APP_RATE_LIMIT",
    userMessage: "Лимит запросов к бирже исчерпан. " + (resetTimestamp === void 0 ? "Повторите запрос позже." : `Лимит освободится в ${new Date(resetTimestamp).toISOString()}.`)
  }),
  unavailable: (details) => new AppError({
    code: "APP_UNAVAILABLE",
    userMessage: "Временный отказ биржи. Повторите запрос позже.",
    details
  })
};
function mapRetCode(retCode, retMsg, ctx) {
  switch (retCode) {
    case 10003:
    case 10004:
    case 33004:
      return KIND.keyRejected();
    case 10010:
      return KIND.ipMismatch();
    case 10005:
      return KIND.permissionDenied(ctx.path);
    case 10009:
    case 10024:
      return KIND.regionBlocked();
    case 10006:
      return KIND.rateLimit(ctx.resetTimestamp);
    case 1e4:
    case 10016:
      return KIND.unavailable({ path: ctx.path, retCode });
    default:
      return new AppError({
        code: "APP_BYBIT_ERROR",
        userMessage: `Биржа отклонила запрос ${ctx.path}: код ${retCode}, «${retMsg}».`,
        details: { path: ctx.path, retCode }
      });
  }
}
function mapHttpStatus(status, ctx) {
  if (status === 401) return KIND.keyRejected();
  if (status === 429) return KIND.rateLimit(ctx.resetTimestamp);
  if (status === 403) {
    return new AppError({
      code: "APP_REGION_BLOCKED",
      userMessage: "Биржа отказала в доступе (HTTP 403). Возможные причины: запрос из региона, который Bybit не обслуживает (США, материковый Китай), или превышен лимит запросов с этого IP — тогда подождите не меньше 10 минут.",
      details: { path: ctx.path, status }
    });
  }
  if (status >= 500) return KIND.unavailable({ path: ctx.path, status });
  return new AppError({
    code: "APP_BYBIT_ERROR",
    userMessage: `Биржа отклонила запрос ${ctx.path}: HTTP ${status}.`,
    details: { path: ctx.path, status }
  });
}
function formatDrift(driftMs) {
  return `${driftMs >= 0 ? "+" : "-"}${(Math.abs(driftMs) / 1e3).toFixed(1)} с`;
}
function clockSkewError(driftMs) {
  const measured = driftMs === null ? "Время биржи получить не удалось, величину расхождения назвать нельзя." : `Локальное время расходится с биржей на ${formatDrift(driftMs)}.`;
  return new AppError({
    code: "APP_CLOCK_SKEW",
    userMessage: `Биржа отвергла запрос из-за расхождения системных часов. ${measured} Синхронизируйте часы (NTP).`,
    details: { driftMs }
  });
}

// src/api/sign.ts
var import_node_crypto = require("node:crypto");
function signPayload(timestamp, apiKey, recvWindow, query) {
  return timestamp + apiKey + recvWindow + query;
}
function sign(payload, secret) {
  return (0, import_node_crypto.createHmac)("sha256", secret).update(payload).digest("hex");
}

// src/api/client.ts
var BybitClient = class {
  baseUrl;
  hasCredentials;
  credentials;
  fetchFn;
  now;
  timeoutMs;
  constructor(options) {
    this.baseUrl = options.baseUrl;
    this.credentials = options.credentials;
    this.hasCredentials = options.credentials !== void 0;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  }
  /** Unsigned GET; returns `result` of the envelope. */
  getPublic(path4, params = {}) {
    return this.request(path4, new URLSearchParams(params).toString(), {});
  }
  /** Signed GET; returns `result` of the envelope. On 10002 names the clock drift (D-3). */
  async getPrivate(path4, params = {}) {
    if (!this.credentials) throw keyMissingError();
    const query = new URLSearchParams(params).toString();
    const timestamp = String(this.now());
    const recvWindow = String(RECV_WINDOW_MS);
    const headers = {
      "X-BAPI-API-KEY": this.credentials.apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow,
      "X-BAPI-SIGN": sign(signPayload(timestamp, this.credentials.apiKey, recvWindow, query), this.credentials.apiSecret)
    };
    try {
      return await this.request(path4, query, headers);
    } catch (err) {
      if (err instanceof AppError && err.code === "APP_CLOCK_SKEW") throw clockSkewError(await this.driftOrNull());
      throw err;
    }
  }
  /** Exchange time in ms from /v5/market/time (timeNano / 1e6). */
  async getServerTimeMs() {
    const t = await this.getPublic("/v5/market/time");
    return Number(BigInt(t.timeNano) / 1000000n);
  }
  /**
   * Local minus exchange time, measured from the request midpoint.
   * Error is at most half the round trip (rttMs / 2).
   */
  async measureDrift() {
    const before = this.now();
    const server = await this.getServerTimeMs();
    const after = this.now();
    return { driftMs: (before + after) / 2 - server, rttMs: after - before };
  }
  async driftOrNull() {
    try {
      return (await this.measureDrift()).driftMs;
    } catch {
      return null;
    }
  }
  async request(path4, query, headers) {
    const url = `${this.baseUrl}${path4}${query ? `?${query}` : ""}`;
    let response;
    try {
      response = await this.fetchFn(url, { headers, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (cause) {
      const reason = cause instanceof DOMException && cause.name === "TimeoutError" ? "timeout" : "network";
      throw new AppError({
        code: "APP_UNAVAILABLE",
        userMessage: `Биржа недоступна (${reason === "timeout" ? "нет ответа за отведённое время" : "нет соединения"}). Повторите запрос позже.`,
        // The fetch error itself is not kept: its message may echo a header value, i.e. the key (D-10).
        details: { path: path4, reason, error: cause instanceof Error ? cause.name : typeof cause }
      });
    }
    const reset = response.headers.get("X-Bapi-Limit-Reset-Timestamp");
    const ctx = { path: path4, resetTimestamp: reset === null ? void 0 : Number(reset) };
    if (!response.ok) throw mapHttpStatus(response.status, ctx);
    const envelope = await parseEnvelope(response, path4);
    if (envelope.retCode === 10002) throw clockSkewError(null);
    if (envelope.retCode !== 0) throw mapRetCode(envelope.retCode, envelope.retMsg, ctx);
    return envelope.result;
  }
};
async function parseEnvelope(response, path4) {
  try {
    return await response.json();
  } catch (cause) {
    throw new AppError({
      code: "APP_UNAVAILABLE",
      userMessage: "Биржа вернула ответ в неожиданном формате (не JSON). Повторите запрос позже.",
      details: { path: path4, status: response.status },
      cause
    });
  }
}

// src/format/table.ts
function renderTable(headers, rows) {
  const widths = headers.map((header, col) => Math.max(header.length, ...rows.map((row) => (row[col] ?? "").length)));
  const renderRow = (cells) => widths.map((width, col) => (cells[col] ?? "").padEnd(width)).join("  ");
  const lines = [renderRow(headers), widths.map((w) => "-".repeat(w)).join("  ")];
  for (const row of rows) lines.push(renderRow(row));
  return lines.join("\n");
}

// src/format/values.ts
var DASH = "—";
function orDash(value2) {
  return value2 === "" ? DASH : value2;
}
function numOrDash(value2, digits = 2) {
  return value2 === null || value2 === void 0 ? DASH : value2.toFixed(digits);
}

// src/valuation/usd.ts
var USD_STABLECOINS = ["USDT", "USDC"];
function isUnvaluedCoin(coin) {
  return Number(coin.equity) !== 0 && Number(coin.usdValue) === 0 && !coin.marginCollateral;
}
function estimateUsd(coin, amount, spotLastPrice) {
  if (USD_STABLECOINS.includes(coin)) return { usd: Number(amount), note: "Стейблкоин, принят равным 1 USD: точная оценка." };
  const pair = `${coin}USDT`;
  const price = spotLastPrice.get(pair);
  if (price === void 0) return { usd: null, note: `На Bybit нет спотовой пары ${pair}: оценка в долларах невозможна.` };
  return { usd: Number(amount) * Number(price), note: `Количество × lastPrice ${pair} = ${price} (спот Bybit, на момент запроса).` };
}

// src/commands/session-status.ts
var UTA_STATUSES = [3, 4, 5, 6];
function maskKey(apiKey) {
  return `****${apiKey.slice(-4)}`;
}
function notReadOnlyError() {
  return new AppError({
    code: "APP_KEY_NOT_READONLY",
    userMessage: "Ключ API имеет права на изменение счёта. Скилл работает только с ключом только на чтение: создайте на Bybit ключ Read-Only и замените им текущий."
  });
}
async function requireReadOnlyKey(client3) {
  const info = await client3.getPrivate("/v5/user/query-api");
  if (info.readOnly !== 1) throw notReadOnlyError();
}
async function capture(fn, problems) {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    if (!problems.some((p) => p.code === err.code)) problems.push({ code: err.code, message: err.userMessage });
    return null;
  }
}
function toKeyView(info) {
  return {
    masked: maskKey(info.apiKey),
    note: info.note,
    readOnly: info.readOnly,
    permissions: info.permissions,
    ips: info.ips,
    type: info.type,
    expiredAt: info.expiredAt,
    deadlineDay: info.deadlineDay,
    uta: info.uta,
    isMaster: info.isMaster
  };
}
function driftNote(driftMs, rttMs, error) {
  if (driftMs === null) return `Время биржи недоступно, расхождение не вычислено: ${error ?? "нет ответа"}`;
  return `Локальное время в середине запроса минус время биржи (/v5/market/time, timeNano), мс. Положительное — локальные часы спешат. Погрешность ±${rttMs / 2} мс (половина времени ответа ${rttMs} мс).`;
}
function clockSkewMessage(driftMs) {
  const drift = `Локальное время расходится с биржей на ${formatDrift(driftMs)}`;
  if (driftMs > 0) return `${drift}: часы спешат, биржа отвергает подписанные запросы при опережении больше 1 с. Синхронизируйте часы (NTP).`;
  if (-driftMs >= RECV_WINDOW_MS) {
    return `${drift}: часы отстают больше окна ${RECV_WINDOW_MS / 1e3} с, биржа отвергает подписанные запросы. Синхронизируйте часы (NTP).`;
  }
  return `${drift}: часы отстают; пока это в пределах окна ${RECV_WINDOW_MS / 1e3} с и запросы проходят, но запас мал. Синхронизируйте часы (NTP).`;
}
function unifiedNote(isUnified) {
  if (isUnified === null) return "Режим счёта не получен, признак UTA не вычислен.";
  return "По unifiedMarginStatus из /v5/account/info: 3–6 — единый торговый счёт (UTA), 1 — классический (docs /v5/enum).";
}
async function sessionStatus(client3, now) {
  const problems = [];
  let serverTimeMs = null;
  let connError = null;
  let driftMs = null;
  let rttMs = 0;
  try {
    const before = now();
    serverTimeMs = await client3.getServerTimeMs();
    const after = now();
    driftMs = (before + after) / 2 - serverTimeMs;
    rttMs = after - before;
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    connError = err.userMessage;
  }
  if (driftMs !== null && Math.abs(driftMs) - rttMs / 2 > CLOCK_SKEW_WARN_MS) {
    problems.push({ code: "APP_CLOCK_SKEW", message: clockSkewMessage(driftMs) });
  }
  let key = null;
  let account = null;
  if (!client3.hasCredentials) {
    const err = keyMissingError();
    problems.push({ code: err.code, message: err.userMessage });
  } else {
    const info = await capture(() => client3.getPrivate("/v5/user/query-api"), problems);
    key = info && toKeyView(info);
    const acc = await capture(() => client3.getPrivate("/v5/account/info"), problems);
    account = acc && { unifiedMarginStatus: acc.unifiedMarginStatus, marginMode: acc.marginMode };
  }
  const isUnified = account ? UTA_STATUSES.includes(account.unifiedMarginStatus) : null;
  if (key && key.readOnly !== 1) {
    const err = notReadOnlyError();
    problems.push({ code: err.code, message: err.userMessage });
  }
  if (isUnified === false) {
    problems.push({
      code: "APP_ACCOUNT_NOT_UTA",
      message: "Счёт не единый торговый (UTA). Опционы и данные скилла доступны только на UTA: переведите счёт в UTA на Bybit."
    });
  }
  return {
    configured: client3.hasCredentials,
    environment: { baseUrl: client3.baseUrl, network: "mainnet" },
    connectivity: { ok: serverTimeMs !== null, serverTimeMs, error: connError },
    key,
    account,
    computed: { clockDriftMs: driftMs, isUnified },
    computedNotes: { clockDriftMs: driftNote(driftMs, rttMs, connError), isUnified: unifiedNote(isUnified) },
    problems
  };
}
function permissionsLine(permissions) {
  const granted = Object.entries(permissions).filter(([, list]) => list.length > 0);
  return granted.length === 0 ? "нет" : granted.map(([group, list]) => `${group}: ${list.join(", ")}`).join("; ");
}
function renderSessionStatus(s) {
  const lines = [];
  if (s.key) {
    lines.push(`Ключ:        ${s.key.masked} «${s.key.note}», только чтение: ${s.key.readOnly === 1 ? "да" : "НЕТ"}`);
    lines.push(`Права:       ${permissionsLine(s.key.permissions)}`);
    lines.push(`IP:          ${s.key.ips.length === 0 ? "без привязки" : s.key.ips.join(", ")}`);
    lines.push(`Срок:        expiredAt ${s.key.expiredAt}, deadlineDay ${s.key.deadlineDay}`);
  } else {
    lines.push(`Ключ:        ${s.configured ? "настроен, данные о ключе не получены" : "не настроен"}`);
  }
  lines.push(`Окружение:   ${s.environment.network}, ${s.environment.baseUrl}`);
  lines.push(
    `Связь:       ${s.connectivity.ok ? `есть, время биржи ${new Date(s.connectivity.serverTimeMs ?? 0).toISOString()}` : `нет — ${s.connectivity.error}`}`
  );
  if (s.account) lines.push(`Счёт:        unifiedMarginStatus ${s.account.unifiedMarginStatus}, ${s.account.marginMode}`);
  const uta = s.computed.isUnified === null ? "—" : s.computed.isUnified ? "да" : "нет";
  const drift = s.computed.clockDriftMs === null ? "—" : formatDrift(s.computed.clockDriftMs);
  lines.push(`UTA:         ${uta} [расчёт]`);
  lines.push(`Часы:        ${drift} [расчёт]`);
  lines.push("", s.problems.length === 0 ? "Проблем нет." : "Проблемы:");
  for (const p of s.problems) lines.push(`- ${p.message} [${p.code}]`);
  lines.push("", "[расчёт] — вычислено скиллом:", `- UTA: ${s.computedNotes.isUnified}`, `- Часы: ${s.computedNotes.clockDriftMs}`);
  return lines.join("\n");
}

// src/commands/balance.ts
var UNVALUED_NOTE = "Биржа не оценивает в долларах монету, которая не может быть залогом (marginCollateral=false): usdValue приходит 0. Оценка не показывается, чтобы не выдавать 0 за стоимость (docs WebSocket wallet, usdValue).";
async function fetchWallet(client3) {
  const wallet = await client3.getPrivate("/v5/account/wallet-balance", { accountType: "UNIFIED" });
  const account = wallet.list[0];
  if (!account) {
    throw new AppError({
      code: "APP_ACCOUNT_NOT_UTA",
      userMessage: "Биржа не вернула единый торговый счёт (UTA). Проверьте режим счёта: session status."
    });
  }
  return account;
}
function unifiedView(c) {
  return { coin: c.coin, equity: c.equity, walletBalance: c.walletBalance, locked: c.locked, borrowAmount: c.borrowAmount, usdValue: c.usdValue };
}
function fundingTotalEquity(overview) {
  return overview.list.find((a) => a.accountType === "FundingAccount")?.totalEquity ?? null;
}
async function spotPrices(client3) {
  const tickers = await client3.getPublic("/v5/market/tickers", { category: "spot" });
  return new Map(tickers.list.map((t) => [t.symbol, t.lastPrice]));
}
function earnView(overview) {
  const earn = overview.list.find((a) => a.accountType === "Earn");
  if (!earn) return { totalEquity: null, coins: [] };
  const coins = (earn.categories ?? []).flatMap((c) => c.coinDetail.map((d) => ({ coin: d.coin, equity: d.equity, category: c.category })));
  return { totalEquity: earn.totalEquity, coins };
}
function totalUsd(unified, funding, fundingEmpty, earn) {
  const scope = "Сумма totalEquity торгового счёта (wallet-balance), кошелька финансирования и Earn (asset-overview). Боты, займы и прочие счета не входят (A-2).";
  if (funding === null && !fundingEmpty) {
    return { value: null, note: "Биржа не вернула итог кошелька финансирования (asset-overview), хотя в нём есть монеты: сумма не вычислена." };
  }
  const notes = [scope];
  if (funding === null) notes.push("Кошелёк финансирования пуст.");
  if (earn === null) notes.push("Earn: биржа не вернула счёт, в сумму не входит.");
  return { value: Number(unified) + Number(funding ?? 0) + Number(earn ?? 0), note: notes.join(" ") };
}
async function balance(client3) {
  await requireReadOnlyKey(client3);
  const account = await fetchWallet(client3);
  const fund = await client3.getPrivate("/v5/asset/transfer/query-account-coins-balance", { accountType: "FUND" });
  const overview = await client3.getPrivate("/v5/asset/asset-overview");
  const fundingCoins = fund.balance.filter((b) => Number(b.walletBalance) !== 0).map((b) => ({ coin: b.coin, walletBalance: b.walletBalance, transferBalance: b.transferBalance }));
  const prices = fundingCoins.length > 0 ? await spotPrices(client3) : /* @__PURE__ */ new Map();
  const fundingUsd = {};
  const fundingNotes = {};
  for (const c of fundingCoins) {
    const e = estimateUsd(c.coin, c.walletBalance, prices);
    fundingUsd[c.coin] = e.usd;
    fundingNotes[c.coin] = e.note;
  }
  const fundingTotal = fundingTotalEquity(overview);
  const earn = earnView(overview);
  const total = totalUsd(account.totalEquity, fundingTotal, fundingCoins.length === 0, earn.totalEquity);
  return {
    unified: { totalEquity: account.totalEquity, coins: account.coin.map(unifiedView) },
    funding: { totalEquity: fundingTotal, coins: fundingCoins },
    earn,
    computed: { unvaluedCoins: account.coin.filter(isUnvaluedCoin).map((c) => c.coin), fundingUsd, totalUsd: total.value },
    computedNotes: { unvaluedCoins: UNVALUED_NOTE, fundingUsd: fundingNotes, totalUsd: total.note }
  };
}
function renderBalance(r) {
  const unvalued = new Set(r.computed.unvaluedCoins);
  const utaRows = r.unified.coins.map((c) => [
    c.coin,
    c.equity,
    c.walletBalance,
    c.locked,
    c.borrowAmount,
    unvalued.has(c.coin) ? `${DASH} (не оценивается биржей)` : c.usdValue
  ]);
  const fundRows = r.funding.coins.map((c) => [c.coin, c.walletBalance, c.transferBalance, numOrDash(r.computed.fundingUsd[c.coin])]);
  const lines = [
    `Торговый счёт (UTA): ${r.unified.totalEquity} USD`,
    renderTable(["Монета", "Equity", "Кошелёк", "Заблок.", "Долг", "USD"], utaRows),
    "",
    `Кошелёк финансирования: ${r.funding.totalEquity ?? DASH} USD`,
    fundRows.length ? renderTable(["Монета", "Кошелёк", "Доступно к переводу", "USD [расчёт]"], fundRows) : "Пусто.",
    "",
    `Earn: ${r.earn.totalEquity ?? DASH} USD`,
    r.earn.coins.length ? renderTable(["Монета", "Количество", "Продукт"], r.earn.coins.map((c) => [c.coin, c.equity, c.category])) : "Пусто.",
    "",
    `Итого, торговый счёт + финансирование + Earn: ${numOrDash(r.computed.totalUsd)} USD [расчёт]`,
    "",
    "[расчёт] — вычислено скиллом:",
    `- Итого: ${r.computedNotes.totalUsd}`,
    ...Object.entries(r.computedNotes.fundingUsd).map(([coin, note]) => `- ${coin}: ${note}`)
  ];
  if (unvalued.size > 0) lines.push(`- Без оценки (${[...unvalued].join(", ")}): ${r.computedNotes.unvaluedCoins}`);
  return lines.join("\n");
}

// src/util/cursor.ts
async function fetchAllPages(fetchPage) {
  const rows = [];
  const seen = /* @__PURE__ */ new Set();
  let cursor = "";
  do {
    seen.add(cursor);
    const page = await fetchPage(cursor);
    rows.push(...page.list);
    cursor = page.nextPageCursor;
    if (cursor && seen.has(cursor)) {
      throw new AppError({
        code: "APP_PAGINATION_LOOP",
        userMessage: "Биржа вернула уже пройденную страницу. Сбор остановлен, чтобы не задвоить записи. Повторите запрос позже."
      });
    }
  } while (cursor);
  return rows;
}

// src/commands/positions.ts
var QUERIES = [
  { category: "option" },
  { category: "linear", settleCoin: "USDT" },
  { category: "linear", settleCoin: "USDC" },
  { category: "inverse" }
];
var EMPTIABLE = ["leverage", "liqPrice", "positionIM", "positionMM"];
var PM_NOTE = "Portfolio Margin: биржа не рассчитывает это значение по отдельной позиции (docs /v5/position/list).";
var EMPTY_NOTE = {
  leverage: "Биржа не вернула плечо по позиции.",
  liqPrice: "Биржа не вернула цену ликвидации: она вне допустимого диапазона цен инструмента (docs /v5/position/list).",
  positionIM: "Биржа не вернула начальную маржу по позиции.",
  positionMM: "Биржа не вернула поддерживающую маржу по позиции."
};
function toView(category, p) {
  return {
    category,
    symbol: p.symbol,
    side: p.side,
    size: p.size,
    avgPrice: p.avgPrice,
    markPrice: p.markPrice,
    positionValue: p.positionValue,
    unrealisedPnl: p.unrealisedPnl,
    leverage: p.leverage,
    liqPrice: p.liqPrice,
    positionIM: p.positionIM,
    positionMM: p.positionMM
  };
}
async function fetchAllPositions(client3) {
  const views = [];
  for (const q of QUERIES) {
    const base = { category: q.category, ...q.settleCoin ? { settleCoin: q.settleCoin } : {}, limit: "200" };
    const rows = await fetchAllPages(
      (cursor) => client3.getPrivate("/v5/position/list", cursor ? { ...base, cursor } : base)
    );
    views.push(...rows.map((p) => toView(q.category, p)));
  }
  return views;
}
function fieldNotes(marginMode, views) {
  const notes = {};
  for (const f of EMPTIABLE) {
    if (views.some((v) => v[f] === "")) notes[f] = marginMode === "PORTFOLIO_MARGIN" ? PM_NOTE : EMPTY_NOTE[f];
  }
  return notes;
}
async function positions(client3) {
  await requireReadOnlyKey(client3);
  const { marginMode } = await client3.getPrivate("/v5/account/info");
  const views = await fetchAllPositions(client3);
  return { marginMode, positions: views, fieldNotes: fieldNotes(marginMode, views) };
}
function renderPositions(result) {
  if (result.positions.length === 0) return `Открытых позиций нет. Режим маржи: ${result.marginMode}.`;
  const rows = result.positions.map((p) => [
    p.symbol,
    p.category,
    p.side,
    p.size,
    p.avgPrice,
    p.markPrice,
    p.unrealisedPnl,
    orDash(p.leverage),
    orDash(p.liqPrice),
    orDash(p.positionIM),
    orDash(p.positionMM)
  ]);
  const table = renderTable(["Инструмент", "Тип", "Сторона", "Размер", "Вход", "Маркировка", "Нереализ.", "Плечо", "Ликвидация", "IM", "MM"], rows);
  const notes = Object.entries(result.fieldNotes).map(([f, note]) => `— ${f}: ${note}`);
  return [`Режим маржи: ${result.marginMode}`, "", table, ...notes.length ? ["", ...notes] : []].join("\n");
}

// src/commands/portfolio.ts
var REALISED_NOTE = "cumRealisedPnl — накопленный реализованный результат по монете за всё время, в единицах монеты (сырое поле wallet-balance). totalRPL — реализованный результат по опционам (option-asset-info). Результат за период — команда pnl.";
function unrealisedTotal(perpUpl, options) {
  if (perpUpl === "") return { value: null, note: "Биржа не вернула totalPerpUPL: сумма нереализованного результата не вычислена." };
  const missing = options.filter((o) => o.totalUPL === "").map((o) => o.coin);
  if (missing.length > 0) {
    return { value: null, note: `Биржа не вернула totalUPL по опционам ${missing.join(", ")}: сумма нереализованного результата не вычислена.` };
  }
  const optionsUpl = options.reduce((sum, o) => sum + Number(o.totalUPL), 0);
  const base = "Сумма totalPerpUPL (бессрочные и фьючерсы, wallet-balance) и totalUPL по опционам (option-asset-info), USD.";
  return { value: Number(perpUpl) + optionsUpl, note: options.length === 0 ? `${base} Опционов нет.` : base };
}
function coinShares(coins, unvalued) {
  const valued = coins.filter((c) => !unvalued.has(c.coin) && Number(c.usdValue) !== 0);
  const sum = valued.reduce((s, c) => s + Number(c.usdValue), 0);
  if (sum <= 0) return { shares: {}, note: "Сумма долларовых оценок монет не положительна: доли не вычислены." };
  const shares = Object.fromEntries(valued.map((c) => [c.coin, Number(c.usdValue) / sum]));
  return {
    shares,
    note: "Доля usdValue монеты от суммы usdValue всех оценённых монет торгового счёта. Монета в долге имеет отрицательный usdValue и отрицательную долю."
  };
}
async function portfolio(client3) {
  await requireReadOnlyKey(client3);
  const { marginMode } = await client3.getPrivate("/v5/account/info");
  const a = await fetchWallet(client3);
  const options = (await client3.getPrivate("/v5/account/option-asset-info")).result.map((o) => ({
    coin: o.coin,
    totalUPL: o.totalUPL,
    totalRPL: o.totalRPL,
    totalDelta: o.totalDelta,
    assetIM: o.assetIM,
    assetMM: o.assetMM
  }));
  const positions2 = await fetchAllPositions(client3);
  const overview = await client3.getPrivate("/v5/asset/asset-overview");
  const fundingTotal = fundingTotalEquity(overview);
  const earnTotal = earnView(overview).totalEquity;
  const coins = a.coin.map((c) => ({ coin: c.coin, equity: c.equity, usdValue: c.usdValue, unrealisedPnl: c.unrealisedPnl, cumRealisedPnl: c.cumRealisedPnl }));
  const unvaluedCoins = a.coin.filter(isUnvaluedCoin).map((c) => c.coin);
  const upl = unrealisedTotal(a.totalPerpUPL, options);
  const total = totalUsd(a.totalEquity, fundingTotal, false, earnTotal);
  const shares = coinShares(coins, new Set(unvaluedCoins));
  const count = (category) => positions2.filter((p) => p.category === category).length;
  return {
    account: {
      marginMode,
      totalEquity: a.totalEquity,
      totalWalletBalance: a.totalWalletBalance,
      totalMarginBalance: a.totalMarginBalance,
      totalAvailableBalance: a.totalAvailableBalance,
      totalInitialMargin: a.totalInitialMargin,
      totalMaintenanceMargin: a.totalMaintenanceMargin,
      accountIMRate: a.accountIMRate,
      accountMMRate: a.accountMMRate,
      totalPerpUPL: a.totalPerpUPL
    },
    coins,
    options,
    positionCounts: { linear: count("linear"), inverse: count("inverse"), option: count("option") },
    fundingTotalEquity: fundingTotal,
    earnTotalEquity: earnTotal,
    computed: { totalValueUsd: total.value, unrealisedPnlTotal: upl.value, coinShares: shares.shares, unvaluedCoins },
    computedNotes: { totalValueUsd: total.note, unrealisedPnlTotal: upl.note, coinShares: shares.note, unvaluedCoins: UNVALUED_NOTE, realised: REALISED_NOTE }
  };
}
function renderPortfolio(r) {
  const a = r.account;
  const share = (coin) => {
    const s = r.computed.coinShares[coin];
    return s === void 0 ? DASH : `${(s * 100).toFixed(1)}%`;
  };
  const coinRows = r.coins.map((c) => [c.coin, c.equity, r.computed.unvaluedCoins.includes(c.coin) ? DASH : c.usdValue, share(c.coin), c.unrealisedPnl, c.cumRealisedPnl]);
  const optionRows = r.options.map((o) => [o.coin, o.totalUPL, o.totalRPL, o.totalDelta, o.assetIM, o.assetMM]);
  return [
    `Всего (торговый счёт + финансирование + Earn): ${numOrDash(r.computed.totalValueUsd)} USD [расчёт]`,
    `Торговый счёт: ${a.totalEquity} USD   Кошелёк финансирования: ${r.fundingTotalEquity ?? DASH} USD   Earn: ${r.earnTotalEquity ?? DASH} USD`,
    `Свободно: ${a.totalAvailableBalance} USD   Режим маржи: ${a.marginMode}`,
    `Баланс кошелька: ${a.totalWalletBalance}   Маржинальный баланс: ${a.totalMarginBalance}`,
    `IM: ${a.totalInitialMargin} (${a.accountIMRate})   MM: ${a.totalMaintenanceMargin} (${a.accountMMRate})`,
    "",
    `Позиции: бессрочные/фьючерсы ${r.positionCounts.linear}, инверсные ${r.positionCounts.inverse}, опционы ${r.positionCounts.option}`,
    `Нереализованный результат: бессрочные ${orDash(a.totalPerpUPL)}, всего ${numOrDash(r.computed.unrealisedPnlTotal)} USD [расчёт]`,
    "",
    renderTable(["Монета", "Equity", "USD", "Доля [расчёт]", "Нереализ.", "Реализ. всего"], coinRows),
    "",
    r.options.length ? renderTable(["Опционы", "Нереализ.", "Реализ.", "Дельта", "IM", "MM"], optionRows) : "Опционов нет.",
    "",
    "[расчёт] — вычислено скиллом:",
    `- Всего: ${r.computedNotes.totalValueUsd}`,
    `- Всего нереализованный: ${r.computedNotes.unrealisedPnlTotal}`,
    `- Доля: ${r.computedNotes.coinShares}`,
    ...r.computed.unvaluedCoins.length ? [`- Без оценки (${r.computed.unvaluedCoins.join(", ")}): ${r.computedNotes.unvaluedCoins}`] : [],
    `Реализованный результат: ${r.computedNotes.realised}`
  ].join("\n");
}

// src/cli/runtime.ts
function bootstrapEnv() {
  loadEnvFile(ENV_PATH, process.env);
}
function formatOutput(value2, json, render) {
  return json ? JSON.stringify(value2, null, 2) : render(value2);
}
function printError(err) {
  if (err instanceof AppError) {
    console.error(`Ошибка: ${err.userMessage} [${err.code}]`);
    if (process.env.BYBIT_DEBUG) console.error("Детали:", JSON.stringify(err.details ?? null));
  } else {
    console.error("Ошибка: непредвиденная ошибка выполнения команды. Запустите с BYBIT_DEBUG=1 для деталей. [APP_UNEXPECTED]");
    if (process.env.BYBIT_DEBUG) console.error(err);
  }
  process.exitCode = 1;
}
function progressReporter(write) {
  let current = { label: "", shown: 0 };
  return (label, done, total) => {
    if (label !== current.label) current = { label, shown: 0 };
    const step = Math.floor(done * 10 / total);
    if (step <= current.shown) return;
    current.shown = step;
    write(`Сбор: ${label} — окно ${done} из ${total}`);
  };
}

// src/cli/register-account.ts
function dataClient() {
  return new BybitClient({ credentials: loadCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
}
function register(program2, name, description, run, render) {
  program2.command(name).description(description).action(async (_opts, cmd) => {
    const { json } = cmd.optsWithGlobals();
    console.log(formatOutput(await run(dataClient()), Boolean(json), render));
  });
}
function registerAccountCommands(program2) {
  register(program2, "portfolio", "сводка счёта: капитал, маржа, результат, распределение", portfolio, renderPortfolio);
  register(program2, "balance", "остатки по монетам: торговый счёт и кошелёк финансирования", balance, renderBalance);
  register(program2, "positions", "открытые позиции: бессрочные, инверсные, опционы", positions, renderPositions);
}

// src/format/history.ts
function utcTime(ms) {
  return new Date(Number(ms)).toISOString().slice(0, 16).replace("T", " ");
}
function renderPeriod(period, coverage) {
  const lines = [`Период: ${utcTime(period.from)} — ${utcTime(period.to)} UTC`];
  for (const c of coverage) if (c.boundary) lines.push(`Граница данных: ${c.boundary}`);
  return lines.join("\n");
}
function sumStrings(values) {
  return values.filter((v) => v !== "").reduce((sum, v) => sum + Number(v), 0);
}

// src/util/window.ts
var DAY_MS = 864e5;
var DEPTH_2Y_DAYS = 729;
var DEPTH_6M_DAYS = 179;
var MIN_REQUEST_INTERVAL_MS = 50;
var isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
function splitWindows(period, windowDays) {
  const size = windowDays * DAY_MS;
  const windows = [];
  for (let from = period.from; from <= period.to; from += size) windows.push({ from, to: Math.min(from + size - 1, period.to) });
  return windows;
}
function clampToDepth(period, source, now) {
  const minFrom = now - source.depthDays * DAY_MS;
  const from = Math.max(period.from, minFrom);
  const boundary2 = period.from < minFrom ? `Биржа отдаёт ${source.label} не глубже ${source.depthText}: данные с ${isoDate(minFrom)}, запрошено с ${isoDate(period.from)}.` : null;
  const coverage = { source: source.label, requestedFrom: period.from, from, to: period.to, boundary: boundary2 };
  return { period: from <= period.to ? { from, to: period.to } : null, coverage };
}
function createThrottle(intervalMs, clock, sleep2) {
  let last = null;
  return async () => {
    const wait = last === null ? 0 : last + intervalMs - clock();
    if (wait > 0) await sleep2(wait);
    last = clock();
  };
}
async function fetchWindowed(client3, source, period, deps2) {
  const clamped = clampToDepth(period, source, deps2.now);
  if (!clamped.period) return { rows: [], coverage: clamped.coverage };
  const windows = splitWindows(clamped.period, source.windowDays);
  const rows = [];
  for (const [i, w] of windows.entries()) {
    const time = source.timeParams ? source.timeParams(w) : { startTime: String(w.from), endTime: String(w.to) };
    const base = { ...source.params, ...time };
    const page = await fetchAllPages(async (cursor) => {
      await deps2.throttle?.();
      const r = await client3.getPrivate(source.path, cursor ? { ...base, cursor } : base);
      return { list: r.list ?? r.rows ?? [], nextPageCursor: r.nextPageCursor };
    });
    rows.push(...page);
    deps2.onProgress?.(source.label, i + 1, windows.length);
  }
  return { rows, coverage: clamped.coverage };
}

// src/valuation/daily-close.ts
var KLINE_WINDOW_DAYS = 1e3;
var utcDay = (ms) => ms - ms % DAY_MS;
var isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
async function fetchDailyCloses(client3, pair, period, throttle) {
  const closes = /* @__PURE__ */ new Map();
  for (const w of splitWindows({ from: utcDay(period.from), to: period.to }, KLINE_WINDOW_DAYS)) {
    await throttle?.();
    const params = { category: "spot", symbol: pair, interval: "D", start: String(w.from), end: String(w.to), limit: String(KLINE_WINDOW_DAYS) };
    const r = await client3.getPublic("/v5/market/kline", params);
    for (const k of r.list) closes.set(Number(k[0]), k[4]);
  }
  return closes;
}
function valueOnDate(coin, amount, time, prices) {
  if (USD_STABLECOINS.includes(coin)) return { usd: Number(amount), note: "Стейблкоин, принят равным 1 USD: точная оценка." };
  const pair = `${coin}USDT`;
  if (!prices.pairs.has(pair)) return { usd: null, note: `На споте Bybit нет пары ${pair}: оценка в долларах невозможна.` };
  const day = isoDay(time);
  const close = prices.closes.get(pair)?.get(utcDay(time));
  if (close === void 0) return { usd: null, note: `Нет дневной свечи ${pair} за ${day}: оценка в долларах невозможна.` };
  const usd = Number(amount) * Number(close);
  if (prices.now !== void 0 && utcDay(prices.now) === utcDay(time)) {
    return { usd, note: `Количество × последняя цена ${pair} = ${close}: дневная свеча за ${day} (UTC) ещё не закрыта, спот Bybit.` };
  }
  return { usd, note: `Количество × цена закрытия дневной свечи ${pair} за ${day} (UTC) = ${close}, спот Bybit.` };
}

// src/commands/funds-flows.ts
var FUNDS_FROM = Date.parse("2023-11-20T00:00:00Z");
var ANY_DEPTH = { depthDays: Infinity, depthText: "" };
var toSeconds = (w) => ({ createTimeFrom: String(Math.floor(w.from / 1e3)), createTimeTo: String(Math.floor(w.to / 1e3)) });
var FUNDS_SOURCES = {
  deposit: { label: "вводы", path: "/v5/asset/deposit/query-record", params: { limit: "50" }, windowDays: 29, intervalMs: 650, ...ANY_DEPTH },
  internalDeposit: { label: "вводы от других UID", path: "/v5/asset/deposit/query-internal-record", params: { limit: "50" }, windowDays: 29, intervalMs: MIN_REQUEST_INTERVAL_MS, ...ANY_DEPTH },
  withdrawal: { label: "выводы", path: "/v5/asset/withdraw/query-record", params: { withdrawType: "2", limit: "50" }, windowDays: 29, intervalMs: 220, ...ANY_DEPTH },
  funding: { label: "журнал кошелька финансирования", path: "/v5/asset/fundinghistory", params: { limit: "100" }, windowDays: 7, intervalMs: MIN_REQUEST_INTERVAL_MS, timeParams: toSeconds, ...ANY_DEPTH }
};
var BOUNDARY = {
  fundingAccountRecordP2PPurchase: "in",
  fundingAccountRecordCancelledP2PSale: "in",
  fundingAccountRecordTransferFromSubAccount: "in",
  fundingAccountRecordP2PSale: "out",
  fundingAccountRecordTransferOut2SubAccount: "out"
};
var INSIDE_GROUPS = [
  "fundingAccountRecordEarn",
  "fundingAccountRecordAirdrop",
  "fundingAccountRecordConvert",
  "fundingAccountRecordFixedRateLoans",
  "fundingAccountRecordTypeDeposit",
  "fundingAccountRecordTypeWithdraw"
];
var INSIDE_TYPES = [
  "fundingAccountRecordTransferFromTradingAccount",
  "fundingAccountRecordTransfer2TradingAccount",
  "fundingAccountRecordPendingDeposit",
  "fundingAccountRecordFiatGAFreeze",
  "fundingAccountRecordConfirmedDeposit",
  "fundingAccountRecordFiatGAUNFreeze"
];
function classifyFundingRow(row) {
  const boundary2 = BOUNDARY[row.description];
  if (boundary2) return boundary2;
  if (INSIDE_GROUPS.includes(row.showBusiType) || INSIDE_TYPES.includes(row.description)) return "inside";
  return "unclassified";
}
var DEPOSIT_DONE = [3, 70012];
var DEPOSIT_FAILED = [4, 70011];
var INTERNAL_FAILED = [3];
var WITHDRAWAL_FAILED = ["CancelByUser", "Reject", "Fail"];
var depositFlow = (d) => ({
  id: `deposit:${d.id}`,
  source: "deposit",
  kind: "Ввод (блокчейн)",
  direction: "in",
  coin: d.coin,
  amount: d.amount,
  fee: d.depositFee,
  status: String(d.status),
  time: Number(d.successAt),
  counted: DEPOSIT_DONE.includes(d.status),
  inProgress: !DEPOSIT_DONE.includes(d.status) && !DEPOSIT_FAILED.includes(d.status)
});
var internalFlow = (d) => ({
  id: `internalDeposit:${d.id}`,
  source: "internalDeposit",
  kind: "Ввод от другого UID",
  direction: "in",
  coin: d.coin,
  amount: d.amount,
  fee: "",
  status: String(d.status),
  time: Number(d.createdTime) * 1e3,
  counted: d.status === 2,
  inProgress: d.status !== 2 && !INTERNAL_FAILED.includes(d.status)
});
var withdrawalFlow = (w) => ({
  id: `withdrawal:${w.withdrawId}`,
  source: "withdrawal",
  kind: w.withdrawType === 1 ? "Вывод на другой UID" : "Вывод (блокчейн)",
  direction: "out",
  coin: w.coin,
  amount: w.amount,
  fee: w.withdrawFee,
  status: w.status,
  time: Number(w.createTime),
  counted: w.status === "success",
  inProgress: w.status !== "success" && !WITHDRAWAL_FAILED.includes(w.status)
});
var fundingFlow = (r, direction) => ({
  id: `funding:${r.currcCursor}`,
  source: "funding",
  kind: r.descriptionEn.trim(),
  direction,
  coin: r.currency,
  amount: r.txnAmt,
  fee: "",
  status: "",
  time: Number(r.createTime) * 1e3,
  counted: true,
  inProgress: false
});
var unclassifiedRow = (r) => ({
  currency: r.currency,
  ioDirection: r.ioDirection,
  txnAmt: r.txnAmt,
  time: Number(r.createTime) * 1e3,
  showBusiType: r.showBusiType,
  description: r.description,
  descriptionEn: r.descriptionEn.trim()
});
var uniqueBy = (rows, key) => [...new Map(rows.map((r) => [key(r), r])).values()];
async function collect(client3, source, period, deps2) {
  return fetchWindowed(client3, source, period, { ...deps2, throttle: deps2.throttleFor?.(source.intervalMs) ?? deps2.throttle });
}
async function collectFlows(client3, period, deps2) {
  const dep = await collect(client3, FUNDS_SOURCES.deposit, period, deps2);
  const internal = await collect(client3, FUNDS_SOURCES.internalDeposit, period, deps2);
  const wd = await collect(client3, FUNDS_SOURCES.withdrawal, period, deps2);
  const fund = await collect(client3, FUNDS_SOURCES.funding, period, deps2);
  const flows = [
    ...uniqueBy(dep.rows, (d) => d.id).map(depositFlow),
    ...uniqueBy(internal.rows, (d) => d.id).map(internalFlow),
    ...uniqueBy(wd.rows, (w) => w.withdrawId).map(withdrawalFlow)
  ];
  const unclassified = [];
  for (const r of uniqueBy(fund.rows, (f) => f.currcCursor)) {
    const cls = classifyFundingRow(r);
    if (cls === "in" || cls === "out") flows.push(fundingFlow(r, cls));
    if (cls === "unclassified") unclassified.push(unclassifiedRow(r));
  }
  flows.sort((a, b) => a.time - b.time);
  return { flows, unclassified, coverage: [dep.coverage, internal.coverage, wd.coverage, fund.coverage] };
}

// src/commands/funds.ts
var SCOPE = "Движение средств через границу основного счёта с 2023-11-20 (первая операция счёта; раньше у биржи записей нет) по момент запроса. Ввод: вводы из блокчейна и от других UID, P2P покупки, отменённые P2P продажи, переводы с субсчёта. Вывод: выводы (сумма, полученная на той стороне; комиссия вывода уменьшает результат), P2P продажи, переводы на субсчёт. P2P оценивается по полученным или отданным USDT 1:1: сколько фиата заплачено, биржа не отдаёт, спред P2P в расчёт не входит. Не ввод: переводы между своими кошельками, награды Earn, Launchpool, аирдропы — они попадают в результат. Займы (Crypto Loans) не учитываются.";
var TOTALS_METHOD = "Сумма долларовых оценок завершённых операций. USDT и USDC — 1:1; прочие монеты — по цене закрытия дневной свечи МОНЕТАUSDT на спот-рынке Bybit за день операции (UTC): погрешность — движение цены внутри дня. За текущий день свеча не закрыта — берётся последняя цена.";
async function dailyPrices(client3, flows, deps2) {
  const times = /* @__PURE__ */ new Map();
  for (const f of flows.filter((x) => x.counted)) if (!USD_STABLECOINS.includes(f.coin)) times.set(f.coin, [...times.get(f.coin) ?? [], f.time]);
  const prices = { pairs: /* @__PURE__ */ new Set(), closes: /* @__PURE__ */ new Map(), now: deps2.now };
  if (times.size === 0) return prices;
  const tickers = await client3.getPublic("/v5/market/tickers", { category: "spot" });
  prices.pairs = new Set(tickers.list.map((t) => t.symbol));
  const throttle = deps2.throttleFor?.(MIN_REQUEST_INTERVAL_MS) ?? deps2.throttle;
  for (const [coin, ts] of times) {
    const pair = `${coin}USDT`;
    if (prices.pairs.has(pair)) prices.closes.set(pair, await fetchDailyCloses(client3, pair, { from: Math.min(...ts), to: Math.max(...ts) }, throttle));
  }
  return prices;
}
function directionTotal(flows, usd, direction) {
  const values = flows.filter((f) => f.counted && f.direction === direction).map((f) => usd[f.id] ?? null);
  return values.includes(null) ? null : values.reduce((s, v) => s + (v ?? 0), 0);
}
function byKind(flows, usd) {
  const groups = /* @__PURE__ */ new Map();
  for (const f of flows.filter((x) => x.counted)) groups.set(`${f.direction}|${f.kind}`, [...groups.get(`${f.direction}|${f.kind}`) ?? [], f]);
  return [...groups.values()].map((g) => ({ kind: g[0].kind, direction: g[0].direction, count: g.length, usd: directionTotal(g, usd, g[0].direction) }));
}
function totalsNote(flows, usd, notes, unclassified) {
  if (unclassified.length > 0) {
    const types = [...new Set(unclassified.map((u) => `${u.descriptionEn} (${u.description})`))].join(", ");
    return `В журнале кошелька финансирования есть строки незнакомого типа: ${types}. Это может быть ввод или вывод, поэтому итоги не вычислены.`;
  }
  const unvalued = flows.filter((f) => f.counted && usd[f.id] === null).map((f) => `${f.id}: ${notes[f.id]}`);
  if (unvalued.length > 0) return `${TOTALS_METHOD} Итог направления не вычислен, есть неоценённые операции: ${unvalued.join(" ")}`;
  return TOTALS_METHOD;
}
function resultNote(netInput, current, hasFlows, inProgress) {
  if (!hasFlows) return "Вводов и выводов не найдено: результат не вычислен.";
  if (inProgress.length > 0) {
    const list = inProgress.map((f) => `${f.id} (${f.kind}, ${f.amount} ${f.coin}, статус ${f.status})`).join(", ");
    return `Есть незавершённые операции: ${list}. Деньги по ним могут быть уже зачислены или списаны, а в итоги они не входят: результат не вычислен.`;
  }
  if (netInput === null) return "Нетто-ввод не вычислен (см. итоги): результат не вычислен.";
  if (current.value === null) return `Стоимость счёта не вычислена: ${current.note}`;
  return "Текущая стоимость счёта минус нетто-ввод (введено − выведено).";
}
async function funds(client3, deps2) {
  await requireReadOnlyKey(client3);
  const period = { from: FUNDS_FROM, to: deps2.now };
  const { flows, unclassified, coverage } = await collectFlows(client3, period, deps2);
  const prices = await dailyPrices(client3, flows, deps2);
  const flowsUsd = {};
  const flowNotes = {};
  for (const f of flows) {
    const e = valueOnDate(f.coin, f.amount, f.time, prices);
    flowsUsd[f.id] = e.usd;
    flowNotes[f.id] = e.note;
  }
  const known = unclassified.length === 0;
  const deposited = known ? directionTotal(flows, flowsUsd, "in") : null;
  const withdrawn = known ? directionTotal(flows, flowsUsd, "out") : null;
  const netInput = deposited === null || withdrawn === null ? null : deposited - withdrawn;
  const account = await fetchWallet(client3);
  const overview = await client3.getPrivate("/v5/asset/asset-overview");
  const current = { unifiedTotalEquity: account.totalEquity, fundingTotalEquity: fundingTotalEquity(overview), earnTotalEquity: earnView(overview).totalEquity };
  const currentValue = totalUsd(current.unifiedTotalEquity, current.fundingTotalEquity, false, current.earnTotalEquity);
  const counted = flows.filter((f) => f.counted);
  const inProgress = flows.filter((f) => f.inProgress);
  const first = counted.length > 0 ? Math.min(...counted.map((f) => f.time)) : null;
  const result = counted.length > 0 && inProgress.length === 0 && netInput !== null && currentValue.value !== null ? currentValue.value - netInput : null;
  return {
    period,
    coverage,
    current,
    flows,
    unclassified,
    computed: {
      flowsUsd,
      byKind: byKind(flows, flowsUsd),
      depositedUsd: deposited,
      withdrawnUsd: withdrawn,
      netInputUsd: netInput,
      currentValueUsd: currentValue.value,
      resultUsd: result,
      firstOperationTime: first,
      days: first === null ? null : Math.floor((deps2.now - first) / DAY_MS)
    },
    computedNotes: {
      flowsUsd: flowNotes,
      totals: totalsNote(flows, flowsUsd, flowNotes, unclassified),
      currentValueUsd: currentValue.note,
      resultUsd: resultNote(netInput, currentValue, counted.length > 0, inProgress),
      scope: SCOPE
    }
  };
}
var DIRECTION = { in: "ввод", out: "вывод" };
function renderFunds(r) {
  const c = r.computed;
  const usd = (v) => `${numOrDash(v)} USD [расчёт]`;
  const lines = [
    `Период: 2023-11-20 — ${utcTime(r.period.to)} UTC`,
    `Первая операция: ${c.firstOperationTime === null ? DASH : `${utcTime(c.firstOperationTime)} UTC`}   Срок: ${c.days ?? DASH} дн. [расчёт]`,
    "",
    `Введено:     ${usd(c.depositedUsd)}`,
    `Выведено:    ${usd(c.withdrawnUsd)}`,
    `Нетто-ввод:  ${usd(c.netInputUsd)}`,
    `Стоимость счёта сейчас: ${usd(c.currentValueUsd)} (торговый ${r.current.unifiedTotalEquity} + финансирование ${r.current.fundingTotalEquity ?? DASH} + Earn ${r.current.earnTotalEquity ?? DASH})`,
    `Результат:   ${usd(c.resultUsd)}`,
    "",
    c.byKind.length === 0 ? "Операций нет." : renderTable(["Тип", "Направление", "Операций", "USD [расчёт]"], c.byKind.map((k) => [k.kind, DIRECTION[k.direction], String(k.count), numOrDash(k.usd)]))
  ];
  const pending = r.flows.filter((f) => !f.counted);
  if (pending.length > 0) {
    lines.push("", "Не учтено (незавершённые и неуспешные):");
    lines.push(renderTable(["Время UTC", "Тип", "Монета", "Сумма", "Статус"], pending.map((f) => [utcTime(f.time), f.kind, f.coin, f.amount, f.status])));
  }
  if (r.unclassified.length > 0) {
    lines.push("", "Строки журнала незнакомого типа (не учтены, итоги не вычислены):");
    lines.push(renderTable(["Время UTC", "Тип", "Ключ", "Монета", "Сумма", "Направление"], r.unclassified.map((u) => [utcTime(u.time), u.descriptionEn, u.description, u.currency, u.txnAmt, u.ioDirection])));
  }
  lines.push(
    "",
    "Пояснения [расчёт]:",
    `- Охват: ${r.computedNotes.scope}`,
    `- Итоги: ${r.computedNotes.totals}`,
    `- Стоимость счёта: ${r.computedNotes.currentValueUsd}`,
    `- Результат: ${r.computedNotes.resultUsd}`
  );
  return lines.join("\n");
}

// src/commands/deliveries.ts
var DELIVERIES_DEFAULT_DAYS = DEPTH_2Y_DAYS;
var CATEGORIES = ["option", "linear", "inverse"];
async function fetchDeliveries(client3, period, deps2) {
  const views = [];
  const coverage = [];
  for (const category of CATEGORIES) {
    const source = { label: `экспирации ${category}`, path: "/v5/asset/delivery-record", params: { category, limit: "50" }, windowDays: 30, depthDays: DEPTH_2Y_DAYS, depthText: "2 лет" };
    const r = await fetchWindowed(client3, source, period, deps2);
    views.push(...r.rows.map((d) => ({ category, symbol: d.symbol, side: d.side, position: d.position, entryPrice: d.entryPrice ?? "", strike: d.strike, deliveryPrice: d.deliveryPrice, fee: d.fee, deliveryRpl: d.deliveryRpl, deliveryTime: d.deliveryTime })));
    coverage.push(r.coverage);
  }
  views.sort((a, b) => b.deliveryTime - a.deliveryTime);
  return { deliveries: views, coverage };
}
async function deliveries(client3, options, deps2) {
  await requireReadOnlyKey(client3);
  const r = await fetchDeliveries(client3, options.period, deps2);
  const coin = options.coin?.toUpperCase();
  return { period: options.period, coverage: r.coverage, deliveries: coin ? r.deliveries.filter((d) => d.symbol.startsWith(coin)) : r.deliveries };
}
function renderDeliveryTable(list) {
  if (list.length === 0) return "Экспираций за период нет.";
  const rows = list.map((d) => [utcTime(d.deliveryTime), d.symbol, d.side, d.position, orDash(d.entryPrice), d.deliveryPrice, d.fee, d.deliveryRpl]);
  return renderTable(["Время UTC", "Контракт", "Сторона", "Объём", "Вход", "Цена расчёта", "Комиссия", "Результат"], rows);
}
function renderDeliveries(r) {
  return [renderPeriod(r.period, r.coverage), "", renderDeliveryTable(r.deliveries)].join("\n");
}

// src/commands/operations.ts
var OPERATIONS_DEFAULT_DAYS = 30;
var JOURNAL_SOURCE = {
  label: "журнал операций",
  path: "/v5/account/transaction-log",
  params: { accountType: "UNIFIED", limit: "50" },
  windowDays: 7,
  depthDays: DEPTH_2Y_DAYS,
  depthText: "2 лет"
};
var NOTES = {
  totals: "Суммы сырых полей по типу операции и валюте за период. change = cashFlow + funding − fee (документация Bybit).",
  feesFunding: "Сумма fee (плюс — расход, минус — возврат) и funding (плюс — получено, минус — уплачено) по валюте за период."
};
function groupBy(rows, key) {
  const groups = /* @__PURE__ */ new Map();
  for (const r of rows) groups.set(key(r), [...groups.get(key(r)) ?? [], r]);
  return groups;
}
function sumFeesFunding(rows) {
  const out = {};
  for (const [currency, list] of groupBy(rows, (r) => r.currency)) {
    out[currency] = { fee: sumStrings(list.map((r) => r.fee)), funding: sumStrings(list.map((r) => r.funding)) };
  }
  return out;
}
function totalsByType(rows) {
  return [...groupBy(rows, (r) => `${r.type}|${r.currency}`).values()].map((list) => ({
    type: list[0].type,
    currency: list[0].currency,
    count: list.length,
    cashFlow: sumStrings(list.map((r) => r.cashFlow)),
    fee: sumStrings(list.map((r) => r.fee)),
    funding: sumStrings(list.map((r) => r.funding)),
    change: sumStrings(list.map((r) => r.change))
  })).sort((a, b) => a.type.localeCompare(b.type) || a.currency.localeCompare(b.currency));
}
function toView2(r) {
  return {
    transactionTime: r.transactionTime,
    type: r.type,
    category: r.category,
    symbol: r.symbol,
    currency: r.currency,
    side: r.side,
    qty: r.qty,
    size: r.size,
    tradePrice: r.tradePrice,
    cashFlow: r.cashFlow,
    fee: r.fee,
    funding: r.funding,
    change: r.change,
    cashBalance: r.cashBalance
  };
}
async function operations(client3, options, deps2) {
  await requireReadOnlyKey(client3);
  const filters = { ...options.type ? { type: options.type } : {}, ...options.currency ? { currency: options.currency } : {} };
  const source = { ...JOURNAL_SOURCE, params: { ...JOURNAL_SOURCE.params, ...filters } };
  const { rows, coverage } = await fetchWindowed(client3, source, options.period, deps2);
  const sorted = [...rows].sort((a, b) => Number(b.transactionTime) - Number(a.transactionTime));
  return {
    period: options.period,
    coverage: [coverage],
    operations: sorted.map(toView2),
    computed: { totals: totalsByType(rows), feesFunding: sumFeesFunding(rows) },
    computedNotes: NOTES
  };
}
var n8 = (v) => v.toFixed(8);
function renderOperations(r) {
  const rows = r.operations.map((o) => [utcTime(o.transactionTime), o.type, orDash(o.symbol), o.currency, orDash(o.cashFlow), orDash(o.fee), orDash(o.funding), o.change]);
  const totals = r.computed.totals.map((t) => [t.type, t.currency, String(t.count), n8(t.cashFlow), n8(t.fee), n8(t.funding), n8(t.change)]);
  return [
    renderPeriod(r.period, r.coverage),
    "",
    r.operations.length ? renderTable(["Время UTC", "Тип", "Инструмент", "Валюта", "cashFlow", "Комиссия", "Фандинг", "Изменение"], rows) : "Операций за период нет.",
    "",
    "Итоги по типам [расчёт]:",
    totals.length ? renderTable(["Тип", "Валюта", "Записей", "cashFlow", "Комиссия", "Фандинг", "Изменение"], totals) : "нет",
    "",
    `* [расчёт] ${r.computedNotes.totals}`
  ].join("\n");
}

// src/options/symbol.ts
var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
var SYMBOL = /^([A-Z0-9]+)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])(?:-([A-Z]+))?$/;
function calendarDate(year, month, day) {
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}
function parseOptionSymbol(symbol) {
  const m = SYMBOL.exec(symbol);
  if (!m) return null;
  const [, baseCoin = "", day = "", mon = "", yy = "", strike = "", cp = "", settle] = m;
  const month = MONTHS.indexOf(mon);
  if (month < 0) return null;
  const expiryDate = calendarDate(2e3 + Number(yy), month, Number(day));
  if (!expiryDate) return null;
  return { baseCoin, expiryDate, strike: Number(strike), type: cp === "C" ? "Call" : "Put", settleCoin: settle ?? "USDC" };
}

// src/options/journal.ts
var DAY_MS2 = 864e5;
var EXPIRY_HOUR_UTC = 8;
var REASON = {
  openedBefore: "Позиция открыта раньше, чем начинается журнал биржи (2 года): её начала в данных нет.",
  open: "Позиция ещё открыта: результат не зафиксирован."
};
var round8 = (v) => Math.round(v * 1e8) / 1e8;
var sizeAfter = (r) => round8(Number(r.size));
var sizeBefore = (r) => round8(Number(r.size) - (r.side === "Buy" ? 1 : -1) * Number(r.qty));
function chainOrder(group, previousSize) {
  const rest = [...group];
  const out = [];
  let next = rest.find((x) => sizeBefore(x) === previousSize) ?? rest.find((x) => !rest.some((y) => y !== x && sizeAfter(y) === sizeBefore(x))) ?? rest[0];
  while (next) {
    out.push(next);
    rest.splice(rest.indexOf(next), 1);
    const size = sizeAfter(next);
    next = rest.find((y) => sizeBefore(y) === size) ?? rest[0];
  }
  return out;
}
function ordered(rows) {
  const byTime = /* @__PURE__ */ new Map();
  for (const r of rows) byTime.set(r.transactionTime, [...byTime.get(r.transactionTime) ?? [], r]);
  const out = [];
  for (const t of [...byTime.keys()].sort((a, b) => Number(a) - Number(b))) {
    const last = out.at(-1);
    out.push(...chainOrder(byTime.get(t), last ? sizeAfter(last) : null));
  }
  return out;
}
function expiredAt(symbol, now) {
  const c = parseOptionSymbol(symbol);
  if (!c) return null;
  const day = Date.parse(`${c.expiryDate}T00:00:00Z`);
  return day + DAY_MS2 <= now ? day + EXPIRY_HOUR_UTC * 36e5 : null;
}
function toPosition(symbol, records, closeTime) {
  const status = sizeBefore(records[0]) !== 0 ? "openedBefore" : closeTime === null ? "open" : "closed";
  return {
    symbol,
    currency: records[0].currency,
    status,
    openTime: Number(records[0].transactionTime),
    closeTime,
    records: records.length,
    result: status === "closed" ? records.reduce((sum, r) => sum + Number(r.change), 0) : null,
    reason: status === "closed" ? null : REASON[status]
  };
}
function optionPositionsFromJournal(rows, now) {
  const bySymbol = /* @__PURE__ */ new Map();
  for (const r of rows.filter((x) => x.category === "option")) bySymbol.set(r.symbol, [...bySymbol.get(r.symbol) ?? [], r]);
  const positions2 = [];
  for (const [symbol, list] of [...bySymbol.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let current = [];
    for (const r of ordered(list)) {
      current.push(r);
      if (sizeAfter(r) === 0) {
        positions2.push(toPosition(symbol, current, Number(r.transactionTime)));
        current = [];
      }
    }
    if (current.length) positions2.push(toPosition(symbol, current, expiredAt(symbol, now)));
  }
  return positions2;
}

// src/commands/pnl.ts
var PNL_DEFAULT_DAYS = DEPTH_2Y_DAYS;
var UNKNOWN_CURRENCY = "не определена";
var NOTES2 = {
  closedPerps: `Сумма closedPnl закрытых бессрочных и фьючерсов (уже за вычетом комиссий открытия и закрытия). Валюта — по записи этого инструмента в журнале; нет записи — «${UNKNOWN_CURRENCY}».`,
  funding: "Сумма funding из журнала за период — справочно: фандинг закрытых позиций уже входит в closedPnl (сверено вживую 2026-09-27), фандинг по ещё открытым позициям в реализованный результат не входит. Плюс — получено, минус — уплачено.",
  fees: "Сумма комиссий из журнала за период — справочно: они уже учтены в closedPnl и в результате опционов, в итог повторно не входят.",
  closedOptions: "Результат закрытых опционов по дате закрытия, за вычетом всех комиссий, включая экспирацию. В пределах 6 месяцев — сумма totalPnl биржи. Глубже — из журнала: по каждой позиции сумма change (премии, расчёт экспирации, комиссии); сверено с totalPnl биржи до цента (2026-09-27). Не видны позиции, открытые до начала журнала и истёкшие вне денег: такая экспирация записей не оставляет.",
  total: "closedPerps + closedOptions по валюте. Комиссии и фандинг уже внутри них. Результат экспираций уже входит в closedOptions. Спот не входит: биржа не считает результат спотовых сделок (закрытых позиций по споту нет). Полный результат за всё время, включая спот, — команда funds."
};
var perpSource = (category) => ({ label: `закрытые позиции ${category}`, path: "/v5/position/closed-pnl", params: { category, limit: "100" }, windowDays: 7, depthDays: DEPTH_2Y_DAYS, depthText: "2 лет" });
var OPTION_SOURCE = { label: "закрытые опционы", path: "/v5/position/get-closed-positions", params: { category: "option", limit: "100" }, windowDays: 7, depthDays: DEPTH_6M_DAYS, depthText: "6 месяцев" };
var inPeriod = (t, p) => t >= p.from && t <= p.to;
function add(map, key, value2) {
  map.set(key, (map.get(key) ?? 0) + value2);
}
function optionsByCurrency(exchange, positions2) {
  const out = /* @__PURE__ */ new Map();
  if (exchange) for (const o of exchange) add(out, parseOptionSymbol(o.symbol)?.settleCoin ?? UNKNOWN_CURRENCY, Number(o.totalPnl));
  else for (const p of positions2) if (p.result !== null) add(out, p.currency, p.result);
  return out;
}
function currencies(perps, options, journal) {
  const currencyOf = new Map(journal.map((r) => [`${r.category}|${r.symbol}`, r.currency]));
  const perp = /* @__PURE__ */ new Map();
  for (const p of perps) add(perp, currencyOf.get(`${p.category}|${p.symbol}`) ?? UNKNOWN_CURRENCY, Number(p.closedPnl));
  const feesFunding = sumFeesFunding(journal);
  const keys = /* @__PURE__ */ new Set([...perp.keys(), ...options.keys(), ...Object.keys(feesFunding)]);
  return [...keys].sort().map((currency) => {
    const closedPerps = perp.get(currency) ?? 0;
    const funding = feesFunding[currency]?.funding ?? 0;
    const closedOptions = options.get(currency) ?? 0;
    return { currency, closedPerps, funding, fees: feesFunding[currency]?.fee ?? 0, closedOptions, total: closedPerps + closedOptions };
  });
}
async function pnl(client3, options, deps2) {
  await requireReadOnlyKey(client3);
  const { period } = options;
  const coverage = [];
  const closedPerps = [];
  for (const category of ["linear", "inverse"]) {
    const r = await fetchWindowed(client3, perpSource(category), period, deps2);
    closedPerps.push(...r.rows.map((p) => ({ category, symbol: p.symbol, side: p.side, closedSize: p.closedSize, avgEntryPrice: p.avgEntryPrice, avgExitPrice: p.avgExitPrice, closedPnl: p.closedPnl, updatedTime: p.updatedTime })));
    coverage.push(r.coverage);
  }
  const fromExchange = period.from >= deps2.now - DEPTH_6M_DAYS * DAY_MS;
  const opt = fromExchange ? await fetchWindowed(client3, OPTION_SOURCE, period, deps2) : null;
  if (opt) coverage.push(opt.coverage);
  const delivered = await fetchDeliveries(client3, period, deps2);
  coverage.push(...delivered.coverage);
  const journalPeriod = fromExchange ? period : { from: deps2.now - DEPTH_2Y_DAYS * DAY_MS, to: period.to };
  const journal = await fetchWindowed(client3, JOURNAL_SOURCE, journalPeriod, deps2);
  coverage.push(clampToDepth(period, JOURNAL_SOURCE, deps2.now).coverage);
  const inside = journal.rows.filter((r) => inPeriod(Number(r.transactionTime), period));
  const closedOptions = (opt?.rows ?? []).map((o) => ({ ...o })).sort((a, b) => b.closeTime - a.closeTime);
  const positions2 = fromExchange ? [] : optionPositionsFromJournal(journal.rows, deps2.now).filter((p) => p.closeTime !== null && inPeriod(p.closeTime, period));
  const excludedCount = positions2.filter((p) => p.status === "openedBefore").length;
  return {
    period,
    coverage,
    closedPerps: closedPerps.sort((a, b) => Number(b.updatedTime) - Number(a.updatedTime)),
    closedOptions,
    deliveries: delivered.deliveries,
    optionPositions: positions2,
    computed: {
      optionsSource: fromExchange ? "exchange" : "journal",
      currencies: currencies(closedPerps, optionsByCurrency(fromExchange ? closedOptions : null, positions2), inside),
      excluded: excludedCount ? `${excludedCount} опционных позиций закрыты в периоде, но открыты раньше начала журнала биржи: их результат в итог не входит.` : null
    },
    computedNotes: NOTES2
  };
}
function renderPnl(r) {
  const perps = r.closedPerps.map((p) => [utcTime(p.updatedTime), p.symbol, p.side, p.closedSize, p.avgEntryPrice, p.avgExitPrice, p.closedPnl]);
  const opts = r.closedOptions.map((o) => [utcTime(o.closeTime), o.symbol, o.side, o.qty, o.avgEntryPrice, o.deliveryPrice || "—", o.totalPnl]);
  const positions2 = r.optionPositions.map((p) => [p.closeTime === null ? "—" : utcTime(p.closeTime), p.symbol, p.currency, numOrDash(p.result, 8), p.reason ?? ""]);
  const shown = r.computed.currencies.filter((c) => c.total !== 0);
  const hidden = r.computed.currencies.length - shown.length;
  const totals = shown.map((c) => [c.currency, numOrDash(c.closedPerps, 8), numOrDash(c.closedOptions, 8), numOrDash(c.total, 8), numOrDash(c.funding, 8), numOrDash(c.fees, 8)]);
  const optionsBlock = r.computed.optionsSource === "exchange" ? ["Закрытые опционы (биржа):", opts.length ? renderTable(["Закрыт UTC", "Контракт", "Сторона", "Объём", "Вход", "Цена расчёта", "Результат"], opts) : "нет"] : ["Закрытые опционы по журналу [расчёт]:", positions2.length ? renderTable(["Закрыта UTC", "Контракт", "Валюта", "Результат", "Почему без результата"], positions2) : "нет"];
  return [
    renderPeriod(r.period, r.coverage),
    "",
    "Закрытые бессрочные и фьючерсы:",
    perps.length ? renderTable(["Закрыта UTC", "Инструмент", "Сторона", "Объём", "Вход", "Выход", "Результат"], perps) : "нет",
    "",
    ...optionsBlock,
    "",
    "Экспирации в деньгах:",
    renderDeliveryTable(r.deliveries),
    "",
    "Итог по валюте [расчёт]:",
    totals.length ? renderTable(["Валюта", "Бессрочные", "Опционы", "Итог", "Фандинг (справочно)", "Комиссии (справочно)"], totals) : "нет",
    ...r.computed.excluded ? [`Не вошло: ${r.computed.excluded}`] : [],
    ...hidden ? [`Валют с нулевым итогом (только комиссии): ${hidden}, полный список — в --json.`] : [],
    "",
    `* [расчёт] Итог: ${r.computedNotes.total}`,
    `* [расчёт] Опционы: ${r.computedNotes.closedOptions}`,
    `* [расчёт] Комиссии: ${r.computedNotes.fees}`
  ].join("\n");
}

// src/commands/trades.ts
var TRADES_DEFAULT_DAYS = 30;
var TRADE_CATEGORIES = ["spot", "linear", "inverse", "option"];
var UNKNOWN_CURRENCY2 = "не указана";
var FEES_NOTE = `Сумма execFee по валюте комиссии за период; строки фандинга не входят. Отрицательная комиссия — возврат (ребейт). «${UNKNOWN_CURRENCY2}» — биржа не заполнила feeCurrency.`;
function toView3(category, e) {
  return {
    category,
    symbol: e.symbol,
    side: e.side,
    execPrice: e.execPrice,
    execQty: e.execQty,
    execValue: e.execValue,
    execFee: e.execFee,
    feeCurrency: e.feeCurrency ?? "",
    isMaker: e.isMaker,
    execType: e.execType,
    execTime: e.execTime,
    tradeIv: e.tradeIv,
    markIv: e.markIv,
    underlyingPrice: e.underlyingPrice,
    indexPrice: e.indexPrice
  };
}
async function trades(client3, options, deps2) {
  await requireReadOnlyKey(client3);
  const views = [];
  const coverage = [];
  for (const category of options.category ? [options.category] : TRADE_CATEGORIES) {
    const params = { category, limit: "100", ...options.symbol ? { symbol: options.symbol } : {} };
    const source = { label: `сделки ${category}`, path: "/v5/execution/list", params, windowDays: 7, depthDays: DEPTH_2Y_DAYS, depthText: "2 лет" };
    const r = await fetchWindowed(client3, source, options.period, deps2);
    views.push(...r.rows.filter((e) => e.execType !== "Funding").map((e) => toView3(category, e)));
    coverage.push(r.coverage);
  }
  views.sort((a, b) => Number(b.execTime) - Number(a.execTime));
  const feesByCurrency = {};
  for (const t of views) {
    const key = t.feeCurrency || UNKNOWN_CURRENCY2;
    feesByCurrency[key] = (feesByCurrency[key] ?? 0) + Number(t.execFee);
  }
  return { period: options.period, coverage, trades: views, computed: { feesByCurrency }, computedNotes: { feesByCurrency: FEES_NOTE } };
}
function renderTrades(r) {
  const rows = r.trades.map((t) => [
    utcTime(t.execTime),
    t.symbol,
    t.side,
    t.execPrice,
    t.execQty,
    `${t.execFee} ${t.feeCurrency}`.trim(),
    t.isMaker ? "мейкер" : "тейкер",
    orDash(t.tradeIv),
    orDash(t.markIv),
    orDash(t.underlyingPrice)
  ]);
  const fees = Object.entries(r.computed.feesByCurrency).map(([c, v]) => `${v.toFixed(8)} ${c}`);
  return [
    renderPeriod(r.period, r.coverage),
    "",
    r.trades.length ? renderTable(["Время UTC", "Инструмент", "Сторона", "Цена", "Объём", "Комиссия", "Роль", "IV сделки", "IV маркир.", "Базовый"], rows) : "Сделок за период нет.",
    "",
    `Комиссии [расчёт]: ${fees.length ? fees.join(", ") : "нет"}`,
    `* [расчёт] ${r.computedNotes.feesByCurrency}`
  ].join("\n");
}

// src/util/period.ts
var badPeriod = (userMessage) => new AppError({ code: "APP_BAD_PERIOD", userMessage });
var dayStart = (date) => Date.parse(`${date}T00:00:00Z`);
function resolvePeriod(args, defaultDays, now) {
  if (args.days !== void 0 && (args.from || args.to)) throw badPeriod("Период задаётся либо --days, либо датами --from/--to, не вместе.");
  if (args.days !== void 0) return { from: now - args.days * DAY_MS, to: now };
  const to = args.to ? Math.min(dayStart(args.to) + DAY_MS - 1, now) : now;
  const from = args.from ? dayStart(args.from) : to - defaultDays * DAY_MS;
  if (from > to) throw badPeriod(`Начало периода (${args.from}) позже его конца.`);
  return { from, to };
}

// src/cli/register-history.ts
function parseDaysArg(value2) {
  if (!/^\d+$/.test(value2) || Number(value2) < 1) throw new InvalidArgumentError("число дней — целое больше нуля, например 30.");
  return Number(value2);
}
function parseDateArg(value2) {
  const ms = Date.parse(`${value2}T00:00:00Z`);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(value2) && !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(value2);
  if (!ok) throw new InvalidArgumentError("дата в формате ГГГГ-ММ-ДД, например 2026-09-01.");
  return value2;
}
function parseCategoryArg(value2) {
  const v = value2.toLowerCase();
  if (!TRADE_CATEGORIES.includes(v)) throw new InvalidArgumentError("категория: spot, linear, inverse или option.");
  return v;
}
var client = () => new BybitClient({ credentials: loadCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function liveDeps() {
  return {
    now: Date.now(),
    throttle: createThrottle(MIN_REQUEST_INTERVAL_MS, Date.now, sleep),
    throttleFor: (intervalMs) => createThrottle(intervalMs, Date.now, sleep),
    onProgress: progressReporter((line) => process.stderr.write(`${line}
`))
  };
}
function withPeriod(cmd, defaultDays, text) {
  return cmd.option("--days <n>", `последние N дней (по умолчанию ${text})`, parseDaysArg).option("--from <date>", "с даты ГГГГ-ММ-ДД (UTC)", parseDateArg).option("--to <date>", "по дату ГГГГ-ММ-ДД включительно (UTC)", parseDateArg);
}
function print(cmd, value2, render) {
  const { json } = cmd.optsWithGlobals();
  console.log(formatOutput(value2, Boolean(json), render));
}
function registerHistoryCommands(program2) {
  withPeriod(program2.command("trades").description("история сделок: цена, объём, комиссия; IV и базовый актив по опционам"), TRADES_DEFAULT_DAYS, "30, до 2 лет").option("--category <c>", "spot, linear, inverse или option", parseCategoryArg).option("--symbol <s>", "один инструмент, например BTCUSDT").action(async (o, cmd) => {
    const deps2 = liveDeps();
    print(cmd, await trades(client(), { period: resolvePeriod(o, TRADES_DEFAULT_DAYS, deps2.now), category: o.category, symbol: o.symbol }, deps2), renderTrades);
  });
  withPeriod(program2.command("operations").description("журнал операций с итогами по типам"), OPERATIONS_DEFAULT_DAYS, "30, до 2 лет").option("--type <t>", "тип операции, например TRADE, SETTLEMENT, DELIVERY").option("--currency <c>", "валюта, например USDT").action(async (o, cmd) => {
    const deps2 = liveDeps();
    print(cmd, await operations(client(), { period: resolvePeriod(o, OPERATIONS_DEFAULT_DAYS, deps2.now), type: o.type, currency: o.currency }, deps2), renderOperations);
  });
  withPeriod(program2.command("pnl").description("реализованный результат: закрытые позиции, экспирации, фандинг"), PNL_DEFAULT_DAYS, "вся глубина биржи, 2 года").action(
    async (o, cmd) => {
      const deps2 = liveDeps();
      print(cmd, await pnl(client(), { period: resolvePeriod(o, PNL_DEFAULT_DAYS, deps2.now) }, deps2), renderPnl);
    }
  );
  withPeriod(program2.command("deliveries").description("исполнения на экспирации: контракт, цена расчёта, результат"), DELIVERIES_DEFAULT_DAYS, "2 года").option("--coin <coin>", "базовая монета, например BTC").action(async (o, cmd) => {
    const deps2 = liveDeps();
    print(cmd, await deliveries(client(), { period: resolvePeriod(o, DELIVERIES_DEFAULT_DAYS, deps2.now), coin: o.coin }, deps2), renderDeliveries);
  });
  program2.command("funds").description("нетто-ввод средств с первой операции (2023-11-20), стоимость счёта и результат").action(async (_o, cmd) => {
    print(cmd, await funds(client(), liveDeps()), renderFunds);
  });
}

// src/catalog/catalog.ts
var import_node_path3 = __toESM(require("node:path"), 1);

// src/catalog/file-cache.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
function readVersionedCache(filePath, schemaVersion, warn) {
  if (!import_node_fs.default.existsSync(filePath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(import_node_fs.default.readFileSync(filePath, "utf8"));
  } catch {
    warn(`Кэш повреждён и будет перезаписан: ${filePath}`);
    return null;
  }
  const envelope = parsed;
  if (!envelope || typeof envelope !== "object" || envelope.schemaVersion !== schemaVersion) return null;
  return envelope.data;
}
function writeVersionedCache(filePath, schemaVersion, data) {
  import_node_fs.default.mkdirSync(import_node_path2.default.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  import_node_fs.default.writeFileSync(tmpPath, JSON.stringify({ schemaVersion, data }));
  import_node_fs.default.renameSync(tmpPath, filePath);
}

// src/catalog/catalog.ts
var CATALOG_TTL_MS = 864e5;
var SCHEMA_VERSION = 1;
function catalogPath(cacheDir) {
  return import_node_path3.default.join(cacheDir, "instruments.json");
}
async function loadCatalog(client3, deps2, refresh = false) {
  const file = catalogPath(deps2.cacheDir);
  const cached = refresh ? null : readVersionedCache(file, SCHEMA_VERSION, deps2.warn);
  if (cached && deps2.now - cached.savedAt < CATALOG_TTL_MS) return { ...cached, fromCache: true };
  const entries = [...await fetchCategory(client3, "spot"), ...await fetchCategory(client3, "linear"), ...await fetchCategory(client3, "inverse")];
  writeVersionedCache(file, SCHEMA_VERSION, { savedAt: deps2.now, entries });
  return { entries, savedAt: deps2.now, fromCache: false };
}
async function findSymbol(client3, deps2, symbol) {
  const wanted = symbol.toUpperCase();
  const pick = (c) => c.entries.filter((e) => e.symbol === wanted);
  const catalog = await loadCatalog(client3, deps2);
  const found = pick(catalog);
  if (found.length > 0 || !catalog.fromCache) return found;
  return pick(await loadCatalog(client3, deps2, true));
}
async function fetchCategory(client3, category) {
  const path4 = "/v5/market/instruments-info";
  const raw = category === "spot" ? (await client3.getPublic(path4, { category })).list : await fetchAllPages((cursor) => {
    const base = { category, limit: "1000" };
    return client3.getPublic(path4, cursor ? { ...base, cursor } : base);
  });
  return raw.map((i) => ({ symbol: i.symbol, category, baseCoin: i.baseCoin, quoteCoin: i.quoteCoin, contractType: i.contractType ?? "", status: i.status }));
}

// src/catalog/resolve.ts
function instrumentNotFound(symbol, category) {
  const where = category ? ` в разделе ${category}` : "";
  const option = parseOptionSymbol(symbol);
  const hint = option ? `Доступные контракты — opt chain ${option.baseCoin} (--expiry ${option.expiryDate}).` : `Найдите точный тикер командой search, например: search ${symbol.slice(0, 3)}.`;
  return new AppError({ code: "APP_INSTRUMENT_NOT_FOUND", userMessage: `Инструмент ${symbol}${where} на Bybit не найден. ${hint}` });
}
async function resolveCategories(client3, deps2, symbol, category) {
  if (category) return [category];
  if (parseOptionSymbol(symbol)) return ["option"];
  const categories = (await findSymbol(client3, deps2, symbol)).map((e) => e.category);
  if (categories.length === 0) throw instrumentNotFound(symbol);
  return categories;
}
async function resolveCategory(client3, deps2, symbol, category) {
  const [first] = await resolveCategories(client3, deps2, symbol, category);
  return first;
}
function badArgument(userMessage) {
  return new AppError({ code: "APP_BAD_ARGUMENT", userMessage });
}
var SYMBOL_REFUSALS = [10001, 110023];
async function getForSymbol(client3, path4, params, explicit) {
  try {
    return await client3.getPublic(path4, params);
  } catch (err) {
    const retCode = err instanceof AppError ? err.details?.retCode : void 0;
    if (retCode !== void 0 && SYMBOL_REFUSALS.includes(retCode)) throw instrumentNotFound(params.symbol ?? "", explicit);
    throw err;
  }
}

// src/commands/history.ts
var CANDLE_INTERVALS = ["D", "W", "M"];
var HISTORY_DEFAULT_DAYS = 365;
var KLINE_LIMIT = 1e3;
var CANDLE_DAYS = { D: 1, W: 7, M: 31 };
var isoDay2 = (ms) => new Date(ms).toISOString().slice(0, 10);
async function history(client3, options, deps2) {
  const symbol = options.symbol.toUpperCase();
  if (options.category === "option" || !options.category && parseOptionSymbol(symbol)) {
    throw badArgument(`Свечей по опционам Bybit не даёт (kline: только spot, linear, inverse). Для ${symbol} есть quote и opt chain.`);
  }
  const category = await resolveCategory(client3, deps2, symbol, options.category);
  const { interval } = options;
  const period = { from: options.period.from - options.period.from % DAY_MS, to: options.period.to };
  const byStart = /* @__PURE__ */ new Map();
  for (const w of splitWindows(period, KLINE_LIMIT * CANDLE_DAYS[interval])) {
    const params = { category, symbol, interval, start: String(w.from), end: String(w.to), limit: String(KLINE_LIMIT) };
    const r = await getForSymbol(client3, "/v5/market/kline", params, options.category);
    for (const k of r.list) {
      const start = Number(k[0]);
      if (start >= period.from && start <= period.to) byStart.set(start, { start, open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5], turnover: k[6] });
    }
  }
  const candles = [...byStart.values()].sort((a, b) => a.start - b.start);
  const last = candles.at(-1);
  return { symbol, category, interval, period, candles, boundary: boundary(symbol, period, interval, candles), lastCandleOpen: last !== void 0 && candleEnd(last.start, interval) > deps2.now };
}
function boundary(symbol, period, interval, candles) {
  const first = candles[0];
  if (!first) return `За период ${isoDay2(period.from)} — ${isoDay2(period.to)} у биржи нет свечей ${symbol}.`;
  if (first.start - period.from < CANDLE_DAYS[interval] * DAY_MS) return null;
  return `Биржа отдаёт свечи ${symbol} с ${isoDay2(first.start)}, раньше данных нет; запрошено с ${isoDay2(period.from)}.`;
}
function candleEnd(start, interval) {
  if (interval === "M") {
    const d = new Date(start);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  return start + CANDLE_DAYS[interval] * DAY_MS;
}
var INTERVAL_TEXT = { D: "дневные", W: "недельные", M: "месячные" };
function renderHistory(r) {
  const rows = r.candles.map((c) => [isoDay2(c.start), c.open, c.high, c.low, c.close, c.volume]);
  return [
    `${r.symbol} (${r.category}), свечи ${INTERVAL_TEXT[r.interval]}, ${isoDay2(r.period.from)} — ${isoDay2(r.period.to)} (UTC)`,
    ...r.boundary ? [r.boundary] : [],
    ...rows.length ? [renderTable(["Начало UTC", "Открытие", "Макс", "Мин", "Закрытие", "Объём"], rows)] : [],
    ...r.lastCandleOpen ? ["Последняя свеча ещё не закрыта: её закрытие — последняя цена."] : []
  ].join("\n");
}

// src/commands/instrument.ts
async function instrument(client3, options, deps2) {
  const symbol = options.symbol.toUpperCase();
  const cards = [];
  for (const category of await resolveCategories(client3, deps2, symbol, options.category)) {
    const r = await getForSymbol(client3, "/v5/market/instruments-info", { category, symbol }, options.category);
    for (const info of r.list) cards.push({ category, info });
  }
  if (cards.length === 0) throw instrumentNotFound(symbol, options.category);
  return { symbol, cards };
}
function flatten(info, prefix = "") {
  return Object.entries(info).flatMap(([key, v]) => {
    const name = prefix + key;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return flatten(v, `${name}.`);
    if ((key === "launchTime" || key === "deliveryTime") && typeof v === "string" && v !== "0") return [[name, `${v} (${new Date(Number(v)).toISOString().slice(0, 16).replace("T", " ")} UTC)`]];
    return [[name, v === null || v === "" ? "—" : String(v)]];
  });
}
function renderInstrument(r) {
  return r.cards.map((c) => [`${r.symbol} (${c.category}):`, renderTable(["Поле", "Значение"], flatten(c.info))].join("\n")).join("\n\n");
}

// src/commands/orderbook.ts
var ORDERBOOK_DEFAULT_DEPTH = 25;
var ORDERBOOK_MAX_DEPTH = 1e3;
var ORDERBOOK_OPTION_MAX_DEPTH = 25;
async function orderbook(client3, options, deps2) {
  const symbol = options.symbol.toUpperCase();
  const category = await resolveCategory(client3, deps2, symbol, options.category);
  const depth = options.depth ?? ORDERBOOK_DEFAULT_DEPTH;
  if (category === "option" && depth > ORDERBOOK_OPTION_MAX_DEPTH) throw badArgument(`Стакан опциона у Bybit не глубже ${ORDERBOOK_OPTION_MAX_DEPTH} уровней.`);
  const r = await getForSymbol(client3, "/v5/market/orderbook", { category, symbol, limit: String(depth) }, options.category);
  if (Array.isArray(r)) throw instrumentNotFound(symbol, category);
  return { symbol, category, depth, bids: r.b, asks: r.a, ts: r.ts };
}
function renderOrderbook(r) {
  const asks = [...r.asks].reverse().map(([price, size]) => ["продажа", price, size]);
  const bids = r.bids.map(([price, size]) => ["покупка", price, size]);
  return [
    `${r.symbol} (${r.category}), до ${r.depth} уровней, ${new Date(r.ts).toISOString().slice(0, 19).replace("T", " ")} UTC`,
    asks.length + bids.length ? renderTable(["Сторона", "Цена", "Объём"], [...asks, ...bids]) : "Стакан пуст: заявок нет."
  ].join("\n");
}

// src/commands/quote.ts
async function quote(client3, options, deps2) {
  const symbol = options.symbol.toUpperCase();
  const quotes = [];
  for (const category of await resolveCategories(client3, deps2, symbol, options.category)) {
    const r = await getForSymbol(client3, "/v5/market/tickers", { category, symbol }, options.category);
    for (const ticker of r.list) quotes.push({ category, ticker });
  }
  if (quotes.length === 0) throw instrumentNotFound(symbol, options.category);
  return { symbol, quotes };
}
var CONTRACT = [["lastPrice", "Последняя"], ["markPrice", "Маркировка"], ["indexPrice", "Индекс"], ["bid1Price", "Покупка"], ["ask1Price", "Продажа"], ["price24hPcnt", "Изм. 24ч (доля)"], ["highPrice24h", "Макс 24ч"], ["lowPrice24h", "Мин 24ч"], ["volume24h", "Объём 24ч"], ["turnover24h", "Оборот 24ч"], ["openInterest", "Открытый интерес"], ["fundingRate", "Фандинг"], ["nextFundingTime", "Следующий фандинг"]];
var FIELDS = {
  spot: [["lastPrice", "Последняя"], ["bid1Price", "Покупка"], ["ask1Price", "Продажа"], ["price24hPcnt", "Изм. 24ч (доля)"], ["highPrice24h", "Макс 24ч"], ["lowPrice24h", "Мин 24ч"], ["volume24h", "Объём 24ч"], ["turnover24h", "Оборот 24ч"]],
  linear: CONTRACT,
  inverse: CONTRACT,
  option: [["lastPrice", "Последняя"], ["markPrice", "Маркировка"], ["bid1Price", "Покупка"], ["ask1Price", "Продажа"], ["markIv", "IV маркировки (доля)"], ["bid1Iv", "IV покупки"], ["ask1Iv", "IV продажи"], ["underlyingPrice", "Базовый актив"], ["delta", "Дельта"], ["gamma", "Гамма"], ["vega", "Вега"], ["theta", "Тета"], ["volume24h", "Объём 24ч"], ["openInterest", "Открытый интерес"]]
};
var TITLE = { spot: "спот", linear: "бессрочный / фьючерс USDT, USDC", inverse: "инверсный", option: "опцион" };
function value(field, raw) {
  if (raw === void 0) return "—";
  if (field === "nextFundingTime" && raw !== "" && raw !== "0") return `${new Date(Number(raw)).toISOString().slice(0, 16).replace("T", " ")} UTC`;
  return orDash(raw);
}
function renderQuote(r) {
  return r.quotes.map((q) => [`${r.symbol} — ${TITLE[q.category]}:`, renderTable(["Поле", "Значение"], FIELDS[q.category].map(([f, label]) => [label, value(f, q.ticker[f])]))].join("\n")).join("\n\n");
}

// src/commands/search.ts
var CATEGORY_ORDER = ["spot", "linear", "inverse"];
var TYPES = {
  LinearPerpetual: "бессрочный",
  LinearFutures: "фьючерс",
  InversePerpetual: "бессрочный инверсный",
  InverseFutures: "фьючерс инверсный"
};
var TEXT_LIMIT = 50;
function rank(e, q) {
  if (e.symbol === q) return 0;
  if (e.baseCoin === q) return 1;
  return e.symbol.includes(q) || e.baseCoin.includes(q) ? 2 : null;
}
async function search(client3, query, deps2) {
  const q = query.trim().toUpperCase();
  const catalog = await loadCatalog(client3, deps2);
  const ranked = catalog.entries.flatMap((e) => {
    const r = rank(e, q);
    return r === null ? [] : [{ e, r }];
  });
  ranked.sort((a, b) => a.r - b.r || CATEGORY_ORDER.indexOf(a.e.category) - CATEGORY_ORDER.indexOf(b.e.category) || (a.e.symbol < b.e.symbol ? -1 : a.e.symbol > b.e.symbol ? 1 : 0));
  const matches = ranked.map(({ e }) => ({ symbol: e.symbol, category: e.category, type: TYPES[e.contractType] ?? "спот", baseCoin: e.baseCoin, quoteCoin: e.quoteCoin, status: e.status }));
  const coins = await client3.getPublic("/v5/market/option-base-coins");
  return { query: q, matches, options: coins.list.filter((c) => c.baseCoin.includes(q)), catalogSavedAt: catalog.savedAt };
}
function renderSearch(r) {
  if (r.matches.length === 0 && r.options.length === 0) return `Ничего не найдено по «${r.query}». Уточните тикер: BTC, BTCUSDT, SOL. Названий монет у Bybit нет, только тикеры.`;
  const rows = r.matches.slice(0, TEXT_LIMIT).map((m) => [m.symbol, m.type, m.category, m.baseCoin, m.quoteCoin, m.status]);
  const more = r.matches.length - rows.length;
  return [
    ...rows.length ? [renderTable(["Тикер", "Тип", "Раздел", "Монета", "Котируется в", "Статус"], rows)] : [],
    ...more > 0 ? [`И ещё ${more}, полный список — в --json.`] : [],
    ...r.options.map((o) => `${o.baseCoin} — опционы${o.hasSymbol ? "" : " (сейчас без торгуемых контрактов)"}: даты — opt expiries ${o.baseCoin}, доска — opt chain ${o.baseCoin}.`),
    `Справочник от ${new Date(r.catalogSavedAt).toISOString().slice(0, 16).replace("T", " ")} UTC.`
  ].join("\n");
}

// src/cli/register-market.ts
function parseIntervalArg(value2) {
  const v = value2.toUpperCase();
  if (!CANDLE_INTERVALS.includes(v)) throw new InvalidArgumentError("интервал свечей: D (день), W (неделя) или M (месяц).");
  return v;
}
function parseDepthArg(value2) {
  const n = Number(value2);
  if (!/^\d+$/.test(value2) || n < 1 || n > ORDERBOOK_MAX_DEPTH) throw new InvalidArgumentError(`глубина стакана — целое от 1 до ${ORDERBOOK_MAX_DEPTH}.`);
  return n;
}
var client2 = () => new BybitClient({ baseUrl: resolveBaseUrl(process.env) });
var deps = () => ({ cacheDir: CACHE_DIR, now: Date.now(), warn: (line) => process.stderr.write(`${line}
`) });
function print2(cmd, value2, render) {
  const { json } = cmd.optsWithGlobals();
  console.log(formatOutput(value2, Boolean(json), render));
}
var CATEGORY_HELP = "spot, linear, inverse или option (по умолчанию — по справочнику)";
function registerMarketCommands(program2) {
  program2.command("quote").description("котировка; тикер из нескольких разделов — по каждому").argument("<symbol>", "тикер, например BTCUSDT").option("--category <c>", CATEGORY_HELP, parseCategoryArg).action(async (symbol, o, cmd) => print2(cmd, await quote(client2(), { symbol, ...o }, deps()), renderQuote));
  program2.command("history").description("свечи: дневные, недельные, месячные; при споте и бессрочном — спот").argument("<symbol>", "тикер, например BTCUSDT").option("--category <c>", CATEGORY_HELP, parseCategoryArg).option("--interval <i>", "D, W или M (по умолчанию D)", parseIntervalArg).option("--days <n>", `последние N дней (по умолчанию ${HISTORY_DEFAULT_DAYS}, до 3 лет и глубже)`, parseDaysArg).option("--from <date>", "с даты ГГГГ-ММ-ДД (UTC)", parseDateArg).option("--to <date>", "по дату ГГГГ-ММ-ДД включительно (UTC)", parseDateArg).action(async (symbol, o, cmd) => {
    const d = deps();
    const period = resolvePeriod(o, HISTORY_DEFAULT_DAYS, d.now);
    print2(cmd, await history(client2(), { symbol, category: o.category, interval: o.interval ?? "D", period }, d), renderHistory);
  });
  program2.command("orderbook").description("стакан; при споте и бессрочном — спот").argument("<symbol>", "тикер, например BTCUSDT").option("--category <c>", CATEGORY_HELP, parseCategoryArg).option("--depth <n>", "уровней на сторону (по умолчанию 25, у опционов не больше 25)", parseDepthArg).action(async (symbol, o, cmd) => print2(cmd, await orderbook(client2(), { symbol, ...o }, deps()), renderOrderbook));
  program2.command("instrument").description("карточка инструмента: статус, шаги цены и количества, плечо, даты").argument("<symbol>", "тикер, например BTCUSDT").option("--category <c>", CATEGORY_HELP, parseCategoryArg).action(async (symbol, o, cmd) => print2(cmd, await instrument(client2(), { symbol, ...o }, deps()), renderInstrument));
  program2.command("search").description("поиск по тикеру: спот, бессрочные, фьючерсы; опционы — по монете").argument("<query>", "часть тикера, например sol").action(async (query, _o, cmd) => print2(cmd, await search(client2(), query, deps()), renderSearch));
}

// src/options/instruments.ts
function fetchOptionInstruments(client3, baseCoin) {
  const base = { category: "option", baseCoin, limit: "1000" };
  return fetchAllPages(
    (cursor) => client3.getPublic("/v5/market/instruments-info", cursor ? { ...base, cursor } : base)
  );
}
function utcDate(ms) {
  return new Date(Number(ms)).toISOString().slice(0, 10);
}
function isMonthly(deliveryTime) {
  const d = new Date(Number(deliveryTime));
  const weekLater = new Date(d.getTime() + 7 * 864e5);
  return d.getUTCDay() === 5 && weekLater.getUTCMonth() !== d.getUTCMonth();
}
var MONTHLY_RULE = "Месячная экспирация — последняя пятница месяца по дате UTC (признака у биржи нет, правило).";

// src/commands/opt-chain.ts
var STRIKE_NOTE = "Страйк разобран из символа по формату Bybit (enum symbol): отдельного поля у биржи нет.";
function toRow(t, inst, strike) {
  return {
    symbol: t.symbol,
    optionsType: inst.optionsType,
    deliveryTime: inst.deliveryTime,
    bid1Price: t.bid1Price,
    bid1Size: t.bid1Size,
    ask1Price: t.ask1Price,
    ask1Size: t.ask1Size,
    markPrice: t.markPrice,
    bid1Iv: t.bid1Iv,
    ask1Iv: t.ask1Iv,
    markIv: t.markIv,
    delta: t.delta,
    gamma: t.gamma,
    vega: t.vega,
    theta: t.theta,
    volume24h: t.volume24h,
    openInterest: t.openInterest,
    underlyingPrice: t.underlyingPrice,
    computed: { strike }
  };
}
function joinRows(tickers, instruments, notes) {
  const cards = new Map(instruments.map((i) => [i.symbol, i]));
  const rows = [];
  const noCard = [];
  const unparsed = [];
  for (const t of tickers) {
    const card = cards.get(t.symbol);
    const contract = parseOptionSymbol(t.symbol);
    if (!card) noCard.push(t.symbol);
    else if (!contract) unparsed.push(t.symbol);
    else rows.push(toRow(t, card, contract.strike));
  }
  if (noCard.length) notes.push(`Нет в instruments-info, исключены (время экспирации неизвестно): ${noCard.join(", ")}.`);
  if (unparsed.length) notes.push(`Символ не разобран, исключены (страйк неизвестен): ${unparsed.join(", ")}.`);
  return rows;
}
var MONTHLY_NOTE = `По умолчанию — ближайшая месячная экспирация. ${MONTHLY_RULE}`;
var earliest = (rows) => rows.filter((r) => r.deliveryTime === rows.reduce((m, x) => Number(x.deliveryTime) < Number(m.deliveryTime) ? x : m).deliveryTime);
function pickExpiry(rows, expiry, now, notes) {
  if (expiry) return rows.filter((r) => utcDate(r.deliveryTime) === expiry);
  const future = rows.filter((r) => Number(r.deliveryTime) > now);
  if (future.length === 0) return [];
  const monthly = future.filter((r) => isMonthly(r.deliveryTime));
  if (monthly.length > 0) {
    notes.push(MONTHLY_NOTE);
    return earliest(monthly);
  }
  notes.push("Впереди нет месячной экспирации: взята ближайшая.");
  return earliest(future);
}
function applyFilters(rows, o) {
  return rows.filter((r) => !o.type || r.optionsType === o.type).filter((r) => o.minStrike === void 0 || r.computed.strike >= o.minStrike).filter((r) => o.maxStrike === void 0 || r.computed.strike <= o.maxStrike).sort((a, b) => a.computed.strike - b.computed.strike || (a.optionsType === "Call" ? -1 : 1));
}
async function optChain(client3, options) {
  const baseCoin = options.coin.toUpperCase();
  const now = options.now ?? Date.now();
  const { list: tickers } = await client3.getPublic("/v5/market/tickers", { category: "option", baseCoin });
  const instruments = await fetchOptionInstruments(client3, baseCoin);
  const notes = [];
  const all = joinRows(tickers, instruments, notes);
  const available = [...new Set(instruments.filter((i) => Number(i.deliveryTime) > now).map((i) => utcDate(i.deliveryTime)))].sort();
  const chosen = pickExpiry(all, options.expiry, now, notes);
  const first = chosen[0];
  if (all.length === 0) notes.push(`По ${baseCoin} биржа не вернула опционов.`);
  else if (!first) notes.push(`На ${options.expiry ?? "будущие даты"} экспирации по ${baseCoin} нет. Доступные даты: ${available.join(", ") || "нет"}.`);
  return {
    baseCoin,
    expiry: first ? { date: utcDate(first.deliveryTime), deliveryTime: first.deliveryTime } : null,
    availableExpiries: available,
    rows: applyFilters(chosen, options),
    computedNotes: { strike: STRIKE_NOTE },
    notes
  };
}
function renderOptChain(r) {
  const head = r.expiry ? `${r.baseCoin}, экспирация ${r.expiry.date} ${new Date(Number(r.expiry.deliveryTime)).toISOString().slice(11, 16)} UTC, контрактов: ${r.rows.length}` : `${r.baseCoin}: доска пуста.`;
  const rows = r.rows.map((x) => [
    String(x.computed.strike),
    x.optionsType,
    x.bid1Price,
    x.ask1Price,
    x.markPrice,
    x.bid1Iv,
    x.ask1Iv,
    x.markIv,
    x.delta,
    x.gamma,
    x.vega,
    x.theta,
    x.volume24h,
    x.openInterest
  ]);
  const lines = [head];
  if (rows.length) lines.push(renderTable(["Страйк*", "Тип", "Bid", "Ask", "Mark", "IV bid", "IV ask", "IV mark", "Delta", "Gamma", "Vega", "Theta", "Объём 24ч", "OI"], rows));
  lines.push(`Доступные даты экспирации: ${r.availableExpiries.join(", ") || "нет"}`, "", `* [расчёт] ${r.computedNotes.strike}`, ...r.notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

// src/commands/opt-expiries.ts
async function optExpiries(client3, options = {}) {
  const instruments = await fetchOptionInstruments(client3, options.coin?.toUpperCase() ?? "All");
  const groups = /* @__PURE__ */ new Map();
  for (const i of instruments) {
    const key = `${i.baseCoin}|${i.deliveryTime}`;
    const row = groups.get(key) ?? { baseCoin: i.baseCoin, date: utcDate(i.deliveryTime), deliveryTime: i.deliveryTime, calls: 0, puts: 0, computed: { monthly: isMonthly(i.deliveryTime) } };
    if (i.optionsType === "Call") row.calls += 1;
    else row.puts += 1;
    groups.set(key, row);
  }
  const expiries = [...groups.values()].sort((a, b) => Number(a.deliveryTime) - Number(b.deliveryTime) || a.baseCoin.localeCompare(b.baseCoin));
  return { expiries, computedNotes: { monthly: MONTHLY_RULE } };
}
function renderOptExpiries(r) {
  if (r.expiries.length === 0) return "Опционов по этой монете нет.";
  const rows = r.expiries.map((e) => [e.baseCoin, e.date, new Date(Number(e.deliveryTime)).toISOString().slice(11, 16), e.computed.monthly ? "да" : "", String(e.calls), String(e.puts)]);
  return [renderTable(["Монета", "Дата", "Время UTC", "Месячная*", "Call", "Put"], rows), "", `* [расчёт] ${r.computedNotes.monthly}`].join("\n");
}

// src/commands/opt-greeks.ts
var SOURCE_NOTES = [
  "Delta — totalDelta из option-asset-info: только опционные позиции, без спота и бессрочных.",
  "Gamma, Vega, Theta — из coin-greeks; на живом счёте равны сумме греков опционных позиций.",
  "Все значения сырые, получены от биржи; скилл их не пересчитывает."
];
async function optGreeks(client3, options = {}) {
  await requireReadOnlyKey(client3);
  const coin = options.coin?.toUpperCase();
  const greeks = await client3.getPrivate("/v5/asset/coin-greeks", coin ? { baseCoin: coin } : {});
  const { result: assets } = await client3.getPrivate("/v5/account/option-asset-info");
  const deltas = new Map(assets.filter((a) => !coin || a.coin === coin).map((a) => [a.coin, a.totalDelta]));
  const byCoin = new Map(greeks.list.map((g) => [g.baseCoin, g]));
  const notes = [...SOURCE_NOTES];
  const coins = [.../* @__PURE__ */ new Set([...byCoin.keys(), ...deltas.keys()])].map((baseCoin) => {
    const g = byCoin.get(baseCoin);
    const delta = deltas.get(baseCoin);
    if (delta === void 0) notes.push(`${baseCoin}: нет в option-asset-info — дельта по опционам не получена.`);
    if (!g) notes.push(`${baseCoin}: нет в coin-greeks — гамма, вега и тета не получены.`);
    return { baseCoin, delta: delta ?? "", gamma: g?.totalGamma ?? "", vega: g?.totalVega ?? "", theta: g?.totalTheta ?? "" };
  });
  return { coins, notes };
}
function renderOptGreeks(r) {
  if (r.coins.length === 0) return "Нетто-греков нет: опционных позиций нет.";
  const rows = r.coins.map((c) => [c.baseCoin, orDash(c.delta), orDash(c.gamma), orDash(c.vega), orDash(c.theta)]);
  return [renderTable(["Монета", "Delta", "Gamma", "Vega", "Theta"], rows), "", ...r.notes.map((n) => `- ${n}`)].join("\n");
}

// src/commands/opt-margin.ts
var SUM_TOLERANCE = 0.01;
var METHOD_NOTE = "Portfolio Margin: MM монеты = худший убыток по сетке сценариев цены и IV (все позиции монеты) + contingency; IM = 1.2 × MM; MM счёта = сумма MM монет; accountMMRate = accountMM / equity. Маржу на отдельный опцион биржа не назначает (сверено на счёте 2026-09-27).";
var SHARE_NOTE = "assetMM / accountMM.";
var LOSS_NOTE = "Убыток опциона в худшем сценарии монеты (priceScale = maxLossPriceMove), из portfolio-margin. У опциона три значения на сценарий: IV вверх, без изменений, вниз; берётся по знаку maxLossIvShock (порядок в документации не описан, выведен из примера документации и живого счёта). Проверка: сумма по опционам совпадает с итогом OPTION до 0.01. Это вклад в риск, не маржа позиции: contingency не делится.";
var atScale = (ranges, scale) => ranges?.find((r) => Number(r.priceScale) === scale)?.pnls;
function ivIndex(pnls, shock) {
  if (pnls.length === 1) return 0;
  return shock > 0 ? 0 : shock < 0 ? 2 : 1;
}
function optionLosses(a, scale, optionTotal) {
  const positions2 = a.optionExpiryDatePnlRanges.flatMap((e) => e.optionPositionPnlRanges);
  if (positions2.length === 0) return { values: {}, note: "Опционных позиций по монете нет." };
  const shock = Number(a.maxLossIvShock);
  const picked = positions2.map((p) => {
    const pnls = atScale(p.pnlRanges, scale);
    const v = pnls?.[ivIndex(pnls, shock)];
    return [p.symbolName, v === void 0 ? null : Number(v)];
  });
  const empty = Object.fromEntries(positions2.map((p) => [p.symbolName, null]));
  if (picked.some(([, v]) => v === null) || optionTotal === "") {
    return { values: empty, note: `Нет сценария priceScale = ${a.maxLossPriceMove} по опционам или итога OPTION: убыток по опционам не определён.` };
  }
  const sum = picked.reduce((s, [, v]) => s + (v ?? 0), 0);
  if (Math.abs(sum - Number(optionTotal)) > SUM_TOLERANCE) {
    return { values: empty, note: `Сумма по опционам (${sum.toFixed(2)}) не сходится с итогом OPTION (${optionTotal}): выбор значения не подтверждён, убытки не показаны.` };
  }
  return { values: Object.fromEntries(picked), note: LOSS_NOTE };
}
function toCoin(a, accountMM) {
  const scale = Number(a.maxLossPriceMove);
  const loss = (k) => atScale(a.totalPnlRanges[k]?.pnlRanges, scale)?.[0] ?? "";
  const worstLoss = { all: loss("ALL"), option: loss("OPTION"), perpetual: loss("PERPETUAL") };
  const notes = worstLoss.all === "" ? [`Биржа не вернула сценарий priceScale = ${a.maxLossPriceMove} (maxLossPriceMove): убыток в худшем сценарии не показан.`] : ["OPTION", "PERPETUAL"].filter((k) => loss(k) === "").map((k) => `Итога ${k} для сценария priceScale = ${a.maxLossPriceMove} в ответе биржи нет.`);
  const losses = optionLosses(a, scale, worstLoss.option);
  const share = accountMM > 0 ? Number(a.asset.assetMM) / accountMM : null;
  return {
    baseCoin: a.baseCoin,
    assetIM: a.asset.assetIM,
    assetMM: a.asset.assetMM,
    maxLossPriceMove: a.maxLossPriceMove,
    maxLossIvShock: a.maxLossIvShock,
    contingencyComponents: a.contingency.contingencyComponents,
    worstLoss,
    options: a.optionExpiryDatePnlRanges.flatMap((e) => e.optionPositionPnlRanges.map((p) => ({ symbol: p.symbolName, position: p.position }))),
    notes,
    computed: { shareOfAccountMM: share, optionLoss: losses.values },
    computedNotes: { shareOfAccountMM: share === null ? "accountMM равен нулю или пуст: доля не вычислена." : SHARE_NOTE, optionLoss: losses.note }
  };
}
async function optMargin(client3) {
  await requireReadOnlyKey(client3);
  const { marginMode } = await client3.getPrivate("/v5/account/info");
  if (marginMode !== "PORTFOLIO_MARGIN") {
    const note = `Режим маржи ${marginMode}, не Portfolio Margin: маржа считается по каждой позиции — см. команду positions (positionIM, positionMM).`;
    return { marginMode, account: null, coins: [], notes: [note] };
  }
  const pm = await client3.getPrivate("/v5/asset/portfolio-margin");
  const { equity, marginBalance, accountIM, accountMM, accountIMRate, accountMMRate } = pm.wallet;
  const account = { equity, marginBalance, accountIM, accountMM, accountIMRate, accountMMRate };
  return { marginMode, account, coins: pm.assetPnlRange.map((a) => toCoin(a, Number(accountMM))), notes: [METHOD_NOTE] };
}
var pct = (v) => v === null ? "—" : `${(v * 100).toFixed(1)}%`;
function renderOptMargin(r) {
  if (!r.account) return r.notes.join("\n");
  const a = r.account;
  const lines = [
    `Капитал ${a.equity} USD, MM ${a.accountMM} (${a.accountMMRate}), IM ${a.accountIM} (${a.accountIMRate})`,
    "",
    renderTable(
      ["Монета", "MM", "IM", "Доля MM*", "Сдвиг цены", "IV-шок", "Убыток всего", "опционы", "бессрочные", "Contingency"],
      r.coins.map((c) => [
        c.baseCoin,
        c.assetMM,
        c.assetIM,
        pct(c.computed.shareOfAccountMM),
        c.maxLossPriceMove,
        c.maxLossIvShock,
        orDash(c.worstLoss.all),
        orDash(c.worstLoss.option),
        orDash(c.worstLoss.perpetual),
        c.contingencyComponents
      ])
    )
  ];
  const optionRows = r.coins.flatMap((c) => c.options.map((o) => [c.baseCoin, o.symbol, o.position, numOrDash(c.computed.optionLoss[o.symbol])]));
  if (optionRows.length) lines.push("", renderTable(["Монета", "Опцион", "Позиция", "Убыток в худшем сценарии*"], optionRows));
  const coinNotes = r.coins.flatMap((c) => [...c.notes.map((n) => `${c.baseCoin}: ${n}`), ...c.computedNotes.optionLoss === LOSS_NOTE ? [] : [`${c.baseCoin}: ${c.computedNotes.optionLoss}`]]);
  lines.push("", "* [расчёт] — вычислено скиллом:", `- Доля MM: ${SHARE_NOTE}`, `- Убыток опциона: ${LOSS_NOTE}`, ...coinNotes.map((n) => `- ${n}`), "", ...r.notes);
  return lines.join("\n");
}

// src/commands/opt-positions.ts
var DAY_MS3 = 864e5;
var CONTRACT_NOTE = "Разобрано из символа по формату Bybit (enum symbol): монета-ДДМММГГ-страйк-C/P[-расчётная монета]; без суффикса — USDC.";
var DAYS_NOTE = "(deliveryTime из instruments-info − текущее время) / 86 400 000, дробные сутки, округление до 0.01.";
var GREEKS_NOTE = "Греки — сырые поля position/list: на всю позицию, с учётом стороны (у проданной позиции знак обратный).";
function fetchOptionPositions(client3) {
  const base = { category: "option", limit: "200" };
  return fetchAllPages(
    (cursor) => client3.getPrivate("/v5/position/list", cursor ? { ...base, cursor } : base)
  );
}
function toView4(p, deliveryTime, now) {
  const contract = parseOptionSymbol(p.symbol);
  const days = deliveryTime === "" ? null : Math.round((Number(deliveryTime) - now) / DAY_MS3 * 100) / 100;
  return {
    symbol: p.symbol,
    side: p.side,
    size: p.size,
    avgPrice: p.avgPrice,
    markPrice: p.markPrice,
    unrealisedPnl: p.unrealisedPnl,
    delta: p.delta,
    gamma: p.gamma,
    vega: p.vega,
    theta: p.theta,
    deliveryTime,
    computed: { contract, daysToExpiry: days },
    computedNotes: {
      contract: contract ? CONTRACT_NOTE : `Символ ${p.symbol} не соответствует формату опциона Bybit: контракт не разобран.`,
      daysToExpiry: days === null ? `Контракта ${p.symbol} нет в instruments-info: время экспирации неизвестно, дни не посчитаны.` : DAYS_NOTE
    }
  };
}
async function optPositions(client3, options = {}) {
  await requireReadOnlyKey(client3);
  const raw = await fetchOptionPositions(client3);
  if (raw.length === 0) return { positions: [] };
  const delivery = new Map((await fetchOptionInstruments(client3, "All")).map((i) => [i.symbol, i.deliveryTime]));
  const now = options.now ?? Date.now();
  return { positions: raw.map((p) => toView4(p, delivery.get(p.symbol) ?? "", now)) };
}
function renderOptPositions(r) {
  if (r.positions.length === 0) return "Опционных позиций нет.";
  const rows = r.positions.map((p) => {
    const c = p.computed.contract;
    return [
      p.symbol,
      c?.baseCoin ?? "—",
      c ? String(c.strike) : "—",
      c?.expiryDate ?? "—",
      c?.type ?? "—",
      numOrDash(p.computed.daysToExpiry),
      p.side,
      p.size,
      p.avgPrice,
      p.markPrice,
      orDash(p.unrealisedPnl),
      p.delta,
      p.gamma,
      p.vega,
      p.theta
    ];
  });
  const head = ["Инструмент", "Монета*", "Страйк*", "Экспирация*", "Тип*", "Дней*", "Сторона", "Размер", "Вход", "Маркировка", "Нереализ.", "Delta", "Gamma", "Vega", "Theta"];
  const notes = [...new Set(r.positions.flatMap((p) => [p.computedNotes.contract, p.computedNotes.daysToExpiry]))];
  return [renderTable(head, rows), "", "* [расчёт] — вычислено скиллом:", ...notes.map((n) => `- ${n}`), "", GREEKS_NOTE].join("\n");
}

// src/cli/register-options.ts
function parseExpiryArg(value2) {
  const ms = Date.parse(`${value2}T00:00:00Z`);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(value2) && !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(value2);
  if (!ok) throw new InvalidArgumentError("дата экспирации в формате ГГГГ-ММ-ДД, например 2026-10-30.");
  return value2;
}
function parseTypeArg(value2) {
  const v = value2.toLowerCase();
  if (v === "call") return "Call";
  if (v === "put") return "Put";
  throw new InvalidArgumentError("тип контракта: call или put.");
}
function parseStrikeArg(value2) {
  const n = Number(value2);
  if (value2.trim() === "" || !Number.isFinite(n)) throw new InvalidArgumentError("страйк — число, например 60000 или 0.85.");
  return n;
}
var accountClient = () => new BybitClient({ credentials: loadCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
var marketClient = () => new BybitClient({ baseUrl: resolveBaseUrl(process.env) });
function print3(cmd, value2, render) {
  const { json } = cmd.optsWithGlobals();
  console.log(formatOutput(value2, Boolean(json), render));
}
function registerOptionCommands(program2) {
  const opt = program2.command("opt").description("опционы: позиции, греки, маржа, доска, экспирации");
  opt.command("positions").description("опционные позиции: контракт, дни до экспирации, греки").action(async (_o, cmd) => print3(cmd, await optPositions(accountClient()), renderOptPositions));
  opt.command("greeks").description("нетто-греки опционов по базовой монете").option("--coin <coin>", "одна базовая монета, например BTC").action(async (o, cmd) => print3(cmd, await optGreeks(accountClient(), o), renderOptGreeks));
  opt.command("margin").description("маржа Portfolio Margin по монетам и вклад опционов в худший сценарий").action(async (_o, cmd) => print3(cmd, await optMargin(accountClient()), renderOptMargin));
  opt.command("chain").description("доска опционов по монете; по умолчанию ближайшая экспирация").argument("<coin>", "базовая монета, например BTC").option("--expiry <date>", "дата экспирации ГГГГ-ММ-ДД", parseExpiryArg).option("--type <type>", "call или put", parseTypeArg).option("--min-strike <n>", "страйк от (включительно)", parseStrikeArg).option("--max-strike <n>", "страйк до (включительно)", parseStrikeArg).action(async (coin, o, cmd) => print3(cmd, await optChain(marketClient(), { ...o, coin }), renderOptChain));
  opt.command("expiries").description("даты экспирации; без монеты — по всем монетам").argument("[coin]", "базовая монета, например BTC").action(async (coin, _o, cmd) => print3(cmd, await optExpiries(marketClient(), { coin }), renderOptExpiries));
}

// src/cli/register-session.ts
function registerSessionCommands(program2) {
  const session = program2.command("session").description("состояние доступа к бирже");
  session.command("status").description("ключ, права, окружение, часы, связь с биржей").action(async (_opts, cmd) => {
    const { json } = cmd.optsWithGlobals();
    const client3 = new BybitClient({ credentials: readCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
    const status = await sessionStatus(client3, Date.now);
    console.log(formatOutput(status, Boolean(json), renderSessionStatus));
  });
}

// src/cli/program.ts
function buildProgram() {
  const program2 = new Command().name("bybit").description("Read-only access to a Bybit account").version("1.0.1").option("--json", "машинный вывод (JSON)");
  registerSessionCommands(program2);
  registerAccountCommands(program2);
  registerOptionCommands(program2);
  registerHistoryCommands(program2);
  registerMarketCommands(program2);
  return program2;
}

// src/cli.ts
bootstrapEnv();
buildProgram().parseAsync().catch(printError);
