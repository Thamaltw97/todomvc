'use strict';

var webdriver = require('selenium-webdriver');

module.exports = function Page(browser) {

	// ----------------- utility methods

	this.tryFindByXpath = function (xpath) {
		return browser.findElements(webdriver.By.xpath(xpath));
	};

	this.findByXpath = function (xpath) {
		return browser.findElement(webdriver.By.xpath(xpath));
	};

	this.getTodoListXpath = function () {
		return this.findFirstExisting(
				webdriver.By.xpath(),
				webdriver.By.css('ul.todo-list'))
			.then(function (elm) {
				if (elm.getAttribute('id') === 'todo-list') {
					return '//ul[@id="todo-list"]';
				}
				return '//ul[@class="todo-list"]';
			});
	};

	this.xPathForItemAtIndex = function (index) {
		// why is XPath the only language silly enough to be 1-indexed?
		return this.getTodoListXpath() + '/li[' + (index + 1) + ']';
	};

	// ----------------- navigation methods

	this.back = function () {
		return browser.navigate().back();
	};

	// ----------------- try / get methods

	// unfortunately webdriver does not have a decent API for determining if an
	// element exists. The standard approach is to obtain an array of elements
	// and test that the length is zero. These methods are used to obtain
	// elements which *might* be present in the DOM, hence the try/get name.

	this.tryGetMainSectionElement = function () {
		return this.tryFindByXpath('//section[@id="main"]');
	};

	this.tryGetFooterElement = function () {
		return this.tryFindByXpath('//footer[@id="footer"]');
	};

	this.tryGetClearCompleteButton = function () {
		return this.tryFindByXpath('//button[@id="clear-completed"]');
	};

	this.tryGetToggleForItemAtIndex = function (index) {
		var xpath = this.xPathForItemAtIndex(index) + '//input[contains(@class,"toggle")]';
		return this.tryFindByXpath(xpath);
	};

	this.tryGetItemLabelAtIndex = function (index) {
		return this.tryFindByXpath(this.xPathForItemAtIndex(index) + '//label');
	};

	// ----------------- DOM element access methods

	this.getFocussedElement = function () {
		return browser.switchTo().activeElement();
	};

	this.getEditInputForItemAtIndex = function (index) {
		var xpath = this.xPathForItemAtIndex(index) + '//input[contains(@class,"edit")]';
		return this.findByXpath(xpath);
	};

	this.getItemInputField = function () {
		return this.findFirstExisting(
				webdriver.By.xpath('//input[@id="new-todo"]'),
				webdriver.By.css('input.new-todo'));
	};

	this.getMarkAllCompletedCheckBox = function () {
		return this.findByXpath('//input[@id="toggle-all"]');
	};

	this.getItemElements = function () {
		return this.getTodoListXpath()
		.then(function (xpath) {
			return this.tryFindByXpath(xpath + '/li');
		}.bind(this));
	};

	this.getNonCompletedItemElements = function () {
		return this.getTodoListXpath()
		.then(function (xpath) {
			return this.tryFindByXpath(xpath + '/li[not(contains(@class,"completed"))]');
		}.bind(this));
	};

	this.getItemsCountElement = function () {
		return this.findByXpath('//span[@id="todo-count"]');
	};

	this.getItemLabelAtIndex = function (index) {
		return this.findByXpath(this.xPathForItemAtIndex(index) + '//label');
	};

	this.getFilterElements = function () {
		return this.tryFindByXpath('//ul[@id="filters"]//a');
	};

	this.getItemLabels = function () {
		return this.getTodoListXpath()
		.then(function (xpath) {
			return this.tryFindByXpath(xpath + '/li//label');
		}.bind(this));
	};

	this.findFirstExisting = function () {
		var args = [].slice.call(arguments);

		if (args.length === 0) {
			throw new Error('Unable to find any matching elements');
		}

		return browser.findElements(args.pop())
		.then(function (elms) {
			if (elms.length) {
				return elms[0];
			}

			return this.findFirstExisting(args);
		}.bind(this));
	};

	// ----------------- page actions
	this.ensureAppIsVisible = function () {
		return this.findFirstExisting(webdriver.By.css('#todoapp'), webdriver.By.css('.todoapp'))
		.thenCatch(function () {
			throw new Error('Unable to find application root, did you start your local server?');
		});
	};

	this.clickMarkAllCompletedCheckBox = function () {
		return this.getMarkAllCompletedCheckBox().then(function (checkbox) {
			checkbox.click();
		});
	};

	this.clickClearCompleteButton = function () {
		return this.tryGetClearCompleteButton().then(function (elements) {
			var button = elements[0];
			button.click();
		});
	};

	this.enterItem = function (itemText) {
		return this.getItemInputField()
		.then(function (textField) {
			return textField.sendKeys(itemText)
			.then(function () {
				return textField.sendKeys(webdriver.Key.ENTER);
			});
		});
	};

	this.toggleItemAtIndex = function (index) {
		return this.tryGetToggleForItemAtIndex(index).then(function (elements) {
			var toggleElement = elements[0];
			toggleElement.click();
		});
	};

	this.editItemAtIndex = function (index, itemText) {
		return this.getEditInputForItemAtIndex(index)
		.then(function (itemEditField) {
			// send 50 delete keypresses, just to be sure the item text is deleted
			var deleteKeyPresses = '';
			for (var i = 0; i < 50; i++) {
				deleteKeyPresses += webdriver.Key.BACK_SPACE;
				deleteKeyPresses += webdriver.Key.DELETE;
			}

			itemEditField.sendKeys(deleteKeyPresses);

			// update the item with the new text.
			itemEditField.sendKeys(itemText);
		});
	};

	this.doubleClickItemAtIndex = function (index) {
		return this.getItemLabelAtIndex(index).then(function (itemLabel) {
			// double click is not 'natively' supported, so we need to send the
			// event direct to the element see:
			// jscs:disable
			// http://stackoverflow.com/questions/3982442/selenium-2-webdriver-how-to-double-click-a-table-row-which-opens-a-new-window
			// jscs:enable
			browser.executeScript('var evt = document.createEvent("MouseEvents");' +
				'evt.initMouseEvent("dblclick",true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0,null);' +
				'arguments[0].dispatchEvent(evt);', itemLabel);
		});
	};

	this.filterByActiveItems = function () {
		return this.getFilterElements().then(function (filters) {
			filters[1].click();
		});
	};

	this.filterByCompletedItems = function () {
		return this.getFilterElements().then(function (filters) {
			filters[2].click();
		});
	};

	this.filterByAllItems = function () {
		return this.getFilterElements().then(function (filters) {
			filters[0].click();
		});
	};
};
