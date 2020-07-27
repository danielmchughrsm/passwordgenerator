/**
 * That's a Battery Staple!
 * Correct Horse!
 *
 * @author John Van Der Loo
 * @version 1.2
 * @license MIT
 *
 * @returns    {CorrectHorseBatteryStaple}
 * @constructor
 */
function CorrectHorseBatteryStaple() {
	"use strict";

	var self = this;

	/**
	 * Application configuration
	 * @type {Object}
	 */
	this.config = {
		storageKey:       "CHBSOptions",
		randomNumberPool: 10
	};

	this.data = [];

	this.dataSets = {};

	this.words = [];

	this.dictionaries = {
		"primary": { file: "wordlist.txt", active: true },
		"jargon": { file: "jargon.txt" },
		"science": { file: "science-terms.txt" },
	};

	/**
	 * UI references
	 * @private
	 * @type {Object}
	 */
	this.ui = {
		$passwordBox: $("#txt"),
		$btnGenerate: $("#btn-generate")
	};

	/**
	 * Shorthand to localStorage
	 * @private
	 * @type {LocalStorage}
	 */
	this.storage = window.localStorage || false;

	// Default options
	this.defaults = {
		minLength:     10,
		firstUpper:    true,
		minWords:      3,
		appendNumbers: true,
		separator:     "-",
		"dict-jargon": false,
		"dict-science": false,
	};

	/**
	 * Session options
	 * @type {Object}
	 */
	this.options = {};

	// Set some sane defaults
	this.options = $.extend(this.options, this.defaults);

	/**
	 * Set an option and optionally save it to LocalStorage if required.
	 *
	 * @param    {string} key
	 * @param    {*}  value
	 */
	this.setOption = function(key, value) {
		this.options[key] = value;

		if ( this.options.saveOptions === true ) {
			this.saveOptions();
		}
	};


	/**
	 * Save Options to LocalStorage
	 */
	this.saveOptions = function() {
		self.storage.setItem(self.config.storageKey, JSON.stringify(self.options));
	};


	/**
	 * Remove Options from LocalStorage
	 */
	this.destroyOptions = function() {
		self.storage.removeItem(self.config.storageKey);
	};


	/**
	 * Update the UI for an option.
	 *
	 * @param    {string}    key
	 * @param    {string}    value
	 */
	this.setUIOption = function(key, value) {
		var $el = $("[data-option='" + key + "']");

		if ( $el.is("input[type=checkbox]") ) {
			$el.prop("checked", value);
			return;
		}

		$el.val(value);

	};


	/**
	 * Set all UI options based on the current options.
	 */
	this.setAllUIOptions = function() {
		var opt;

		for ( opt in this.options ) {
			if ( this.options.hasOwnProperty(opt) ) {
				self.setUIOption(opt, this.options[opt]);
			}
		}

	};

	/**
	 * Set a config option from the UI
	 *
	 * @param {HTMLElement} el
	 */
	this.setOptionFromUI = function(el) {
		var $el = $(el),
			val = $el.val();

		if ( $el.is("[type=checkbox]") ) {
			val = $el.prop("checked");
		}

		self.setOption($el.data("option"), val);
	};


	/**
	 * Load a data file and fire an optional callback.
	 * The data file is assumed to be a CSV list of words and will be
	 * split in to an array of words and appended to the main data key
	 *
	 * @param {string} dictName Dictionary to load
	 * @param {Function} [callback] optional callback
	 */
	this.loadData = function(dictName, callback) {

		return $.get("data/" + self.dictionaries[dictName].file, function(content, textStatus) {

			self.dictionaries[dictName].data = content.toString().split(",");
			self.data = self.getDataForActiveDictionaries();
			if ( callback ) {
				callback.call(this, content, textStatus);
			}

		}, "text");
	};

	this.getDataForActiveDictionaries = function() {
		return Object.values(self.dictionaries)
		.filter(d => d.active)
		.map(dict => dict.data)
		.reduce((data, dict) => {
			return data.concat(dict);
		}, []);
	};

	/**
	 * Generate a uniformly distributed random integer using
	 * the crypto API. It will be a number in the range starting
	 * with lower and up to (but without) upper.
	 *
	 * @param {number} lower - The lower bound of the range of numbers.
	 * @param {number} upper - The upper bound of the range of numbers (not included).
	 */
	this.getUniformRandomInteger = function(lower, upper) {
		lower = Math.round(lower);
		upper = Math.round(upper);

		const difference = upper - lower;

		if (difference <= 0) {
			throw Error("The upper bound is not greater than the lower bound.");
		}

		const maxUint32 = Math.pow(2, 32) - 1;
		const maxRandomNumber = Math.floor(maxUint32 / difference) * difference;
		const randomArray = new Uint32Array(1);

		/*
		 * Generate random numbers until they are smaller than
		 * maxRandomNumber. This is necessary because if the
		 * number is bigger than maxRandomNumber, the modulo
		 * operator will introduce a bias.
		 */
		do {
			window.crypto.getRandomValues(randomArray);
		} while (randomArray[0] > maxRandomNumber);

		return lower + (randomArray[0] % difference);
	}


	/**
	 * Retrieve a number of random words from our dataset
	 *
	 * @param {number} n Number of words to get
	 *
	 * @returns {Array}  The array of words
	 */
	this.getRandomWords = function(n) {
		var len = this.data.length,
			rand = this.getUniformRandomInteger(0, len),
			i, word;

		for ( i = 0; i < n; i++ ) {
			word = this.data[rand];
			word = this.options.firstUpper ? word.charAt(0).toUpperCase() + word.slice(1) : word;
			this.words.push(word);
			rand = this.getUniformRandomInteger(0, len);
		}

		return this.words;
	};


	/**
	 * Generate a password
	 */
	this.generate = function() {

		this.words = [];

		this.options.minWords = parseInt(this.options.minWords, 10) || this.defaults.minWords;
		this.options.minLength = parseInt(this.options.minLength, 10) || this.defaults.minLength;

		this.fullPassword = this.getWords();

		this.ui.$passwordBox.val(this.fullPassword).trigger("change");

		return this.fullPassword;
	};


	/**
	 * Get words from the wordlist
	 *
	 * @param    {number}    [numWords]    Number of words to get
	 */
	this.getWords = function(numWords) {
		var fullword;

		if ( numWords === undefined ) {
			numWords = this.options.minWords;
		}

		this.getRandomWords(numWords);

		//generate a full string to test against min length
		fullword = this.words.join(this.options.separator.substring(0, 1) || "");

		//recurse untill our password is long enough;
		if ( fullword.length < this.options.minLength ) {
			return this.getWords(1);
		}
		else {
			//once we have enough words
			fullword = this.join(this.words, this.stringToArray(this.options.separator));
			return fullword;
		}
	};

	/**
	 * Join a set of words with random separators
	 *
	 * @param   {Array}    words       Array of words
	 * @param   {Array}    separators
	 * @returns {string}
	 */
	this.join = function(words, separators) {
		var wordsLen,
			i,
			theString = "",
			symbol = "";

		wordsLen = words.length;

		if ( this.options.appendNumbers ) {
			words.push(this.getUniformRandomInteger(0, this.config.randomNumberPool));
			wordsLen = words.length;
		}

		for ( i = 0; i < wordsLen; i++ ) {

			if ( i !== wordsLen - 1 ) {
				symbol = this.getSeparator(separators);
			}
			else {
				symbol = "";
			}

			theString += words[i] + symbol;
		}
		return theString;
	};


	/**
	 * Convert a string to an array of characters
	 *
	 * @param {string} str The string
	 * @returns {(Array|boolean)}  Array of characters
	 */
	this.stringToArray = function(str) {
		var chars = [],
			i = 0,
			len = str.length || 0,
			theChar = "";

		if ( typeof(str) !== "string" && len === 0 ) {
			return false;
		}

		for ( i; i < len; i++ ) {
			theChar = str.substring(i, i + 1);
			chars.push(theChar);
		}
		return chars;
	};


	/**
	 * Get a random separator from the separators array
	 *
	 * @param    {Array}    seps
	 * @returns    {String}
	 */
	this.getSeparator = function(seps) {
		return seps[ this.getUniformRandomInteger(0, seps.length) ] || "";
	};


	/**
	 * Bind all UI related events
	 */
	this.bindEvents = function() {

		//Update options when UI is updated
		$("[data-option]").on("keyup change", function() {
			self.setOptionFromUI(this);
		});

		this.ui.$btnGenerate.on("click keypress", function() {
			self.generate();
		});

		this.ui.$passwordBox.on("keyup change", function() {
			$(this).parent().find("em").html($(this).val().length);
		});

		// Update the saveOptions option
		$("#save-options").on("change", function() {
			if ( $(this).prop("checked") === true ) {
				self.saveOptions();
			}
			// If we no longer wish to save, destroy our LS entry
			else {
				self.destroyOptions();
			}

		});


		$("input[data-option^='dict-']").on("change", function(){
			const checked = $(this).prop("checked");
			const dict = $(this).attr('data-dict');
			self.dictionaries[dict].active = checked;
			
			if (checked === true){
				if (!self.dictionaries[dict].data) {
					self.loadData(dict);
				}
			}
			self.data = self.getDataForActiveDictionaries();

		});


		$("fieldset.options > legend").on('click', function() {
			$(this).closest("fieldset").toggleClass("active");
		});

		$("#copy").on('click', e => {
			e.preventDefault();
			this.copyPassword();
			e.target.focus();
		});

		$("#copy-to-url").on('click', e => {
			const href = window.location.href;
			const baseUrl = href.substr(0, Math.max(href.indexOf('?'), href.length));
			const search = '?' + this.optionsToQueryString();
			_copy(baseUrl + search, 'URL')
		});

	};

	const notification = (type, message) => {
		return `<div class="notification ${type}">${message}</div>`;
	};

	this.notify = function(type, msg) {
		$('#notifications').addClass('active').html(notification(type, msg));
		clearTimeout(this.notificationTimer);
		this.notificationTimer = setTimeout(() => {
			$('#notifications').removeClass('active');
		}, 10000);
	}

	const _copy = (value, subject) => navigator.clipboard
		.writeText(value)
		.then(() => 'copied', () => 'notcopied')
		.then(result => {
			if (result === 'copied') {
				this.notify('success', `${subject} copied to clipboard`);
			} else {
				this.notify('fail', `${subject} could not be copied to clipboard. Please ensure your browser has clipboard permissions allowed for this site.`)
			}
			return result;
		});

	this.copyPassword = function() {
		const el = document.getElementById('txt');
		_copy(el.value, 'Password').then(result => {
			el.classList.add(result)
			setTimeout(() => {
				el.classList.remove(result);
			}, 300);
		})

	};

	this.loadOptions = function(){ 
		let queryParams = {};

		if (window.location.search) {
			// try and get options from the query params
			// substring from 1 to remove the leading '?'
			queryParams = Array
				.from((new URLSearchParams(window.location.search)).entries())
				.reduce((map, [k,v]) => {
					//parse out the values that are meant to be boolean
					if (typeof this.options[k] === 'boolean') {
						v = v === 'true' ? true : false;
					} 
					map[k] = v;
					return map;
				}, {});
		}

		// Load options from the LocalStorage if present
		if ( this.storage && this.storage.getItem(this.config.storageKey) ) {
			try {
				const lsOptions = JSON.parse(this.storage.getItem(this.config.storageKey));
				this.options = { ...lsOptions, ...queryParams };
				this.setAllUIOptions();

			} catch ( e ) {
				console.log("Could not parse settings from LocalStorage");
			}
		}

		// no local storage available, read the options from the UI
		else {
			$("[data-option]").each(function() {
				self.setOptionFromUI(this);
			});
			if (Object.keys(queryParams).length) {
				this.options = { ...this.options, ...queryParams }
				this.setAllUIOptions();
			}
		}		
	}

	this.optionsToQueryString = function() {
		return (new URLSearchParams(Object.entries(this.options))).toString();
	};

	/**
	 * Initialize this horse
	 */
	this.init = function() {

		this.loadOptions();

		// mark saved dictionaries as active
		Object.entries(this.dictionaries).forEach(([name, dict]) => {
			if (this.options['dict-' + name]) {
				this.dictionaries[name].active = true;
			}
		});

		// load all the active dictionaries
		Promise.all(Object.entries(this.dictionaries).filter(([dictName, dict]) => dict.active).map(([dictName, dict]) => {
			return this.loadData(dictName)
		})).then(() => this.generate());
		
		// Bind Events
		this.bindEvents();
	};


	this.init();

	return this;

}

// Set up for AMD inclusion
if (typeof define === "function") {
	define(["jquery"], function() {
		"use strict";
		return CorrectHorseBatteryStaple;
	});
}
else {
	window.CHBS = new CorrectHorseBatteryStaple();
}

/*
 This software is licensed under the MIT License:

 Copyright (c) 2013, John Van Der Loo

 Permission is hereby granted, free of charge, to any person obtaining a copy of this
 software and associated documentation files (the "Software"), to deal in the Software
 without restriction, including without limitation the rights to use, copy, modify, merge,
 publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
 to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
