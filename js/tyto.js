/*
tyto - http://jh3y.github.io/tyto
Licensed under the MIT license

Jhey Tompkins (c) 2014.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

define(['jquery', 'jqueryUI', 'jqueryUItouchpunch', 'config', 'handlebars', 'text!templates/tyto/column.html', 'text!templates/tyto/item.html', 'text!templates/tyto/actions.html', 'text!templates/tyto/email.html'], function($, jqueryUI, jqueryUItouchpunch, config, Handlebars, columnHtml, itemHtml, actionsHtml, emailHtml) {
  var tyto;
  tyto = function(options) {
    if (!(this instanceof tyto)) {
      return new tyto();
    }
    config = options !== undefined ? options : config;
    this.config = window.localStorage.tyto !== undefined ? JSON.parse(window.localStorage.tyto) : config;
    this.modals = {};
    this.undo = {};
    this._autoSave = this.config.autoSave;
    this._bindPageEvents();
    if (config.showIntroModalOnLoad && config.introModalId) {
      this.modals.introModal = $('#' + config.introModalId);
      this._bindIntroModalEvents();
      this.modals.introModal.modal({
        backdrop: 'static'
      });
    } else {
      this._createBarn(this.config);
    }
    return this;
  };
  tyto.prototype._bindIntroModalEvents = function() {
    tyto = this;
    tyto.modals.introModal.find('.loadtytodefaultconfig').on('click', function(e) {
      return tyto._createBarn(tyto.config);
    });
    tyto.modals.introModal.find('.loadtytocolumns').on('click', function(e) {
      var columns, i, numberOfCols;
      columns = [];
      numberOfCols = parseInt(tyto.modals.introModal.find('.tytonumberofcols').val());
      i = 0;
      while (i < numberOfCols) {
        columns.push({
          title: "column",
          tasks: []
        });
        i++;
      }
      tyto.config.columns = columns;
      return tyto._createBarn(tyto.config);
    });
    return tyto.modals.introModal.find('.tytoloadconfig').on('click', function(e) {
      return tyto.loadBarn();
    });
  };
  tyto.prototype._createBarn = function(config) {
    tyto = this;
    tyto._buildDOM(config);
    tyto.element.find('[data-action="addcolumn"]').on('click', function(e) {
      return tyto.addColumn();
    });
    tyto._bindActions();
    if (tyto.modals.introModal !== undefined) {
      tyto.modals.introModal.modal('hide');
    }
    tyto.undo = {};
    $('[data-action="undolast"]').removeClass('btn-info').addClass('btn-disabled').attr('disabled', true);
    return tyto.element.sortable({
      connectWith: '.column',
      handle: '.column-mover',
      placeholder: 'column-placeholder',
      axis: "x",
      containment: "#barn",
      opacity: 0.8,
      start: function(event, ui) {
        var columnList;
        tyto._movedItem = $(ui.item);
        tyto._movedItemOrigin = $(event.currentTarget);
        columnList = Array.prototype.slice.call(tyto.element.children('.column'));
        return tyto._movedItemIndex = columnList.indexOf($(ui.item)[0]);
      },
      stop: function(event, ui) {
        tyto.element.trigger({
          type: 'tyto:action',
          name: 'move-column',
          DOMcolumn: tyto._movedItem,
          itemIndex: tyto._movedItemIndex
        });
        return tyto.notify('column moved', 2000);
      }
    });
  };
  tyto.prototype._buildDOM = function(config) {
    var i;
    tyto = this;
    if (tyto._autoSave === false || tyto._autoSave === void 0) {
      $('.actions [data-action="toggleautosave"] i').toggleClass('fa-check-square-o fa-square-o');
    }
    if (config.DOMElementSelector !== undefined || config.DOMId !== undefined) {
      tyto.element = config.DOMId !== undefined ? $('#' + config.DOMId) : $(config.DOMElementSelector);
      tyto.element.attr('data-tyto', 'true');
      if (config.columns !== undefined && config.columns.length > 0) {
        tyto.element.find('.column').remove();
        i = 0;
        while (i < config.columns.length) {
          tyto._createColumn(config.columns[i]);
          i++;
        }
        tyto._resizeColumns();
        if (tyto.element.find('.tyto-item').length > 0) {
          return $.each(tyto.element.find('.tyto-item'), function(index, item) {
            return tyto._binditemEvents($(item));
          });
        }
      }
    }
  };
  tyto.prototype._createColumn = function(columnData) {
    var $newColumn, template;
    template = Handlebars.compile(columnHtml);
    Handlebars.registerPartial("item", itemHtml);
    $newColumn = $(template(columnData));
    this._bindColumnEvents($newColumn);
    this.element.append($newColumn);
    return tyto.element.trigger({
      type: 'tyto:action',
      name: 'add-column',
      DOMcolumn: $newColumn,
      DOMitem: void 0
    });
  };
  tyto.prototype._bindPageEvents = function() {
    var inThrottle, setUpLS, throttle;
    tyto = this;
    inThrottle = void 0;
    throttle = function(func, delay) {
      if (inThrottle) {
        clearTimeout(inThrottle);
      }
      return inThrottle = setTimeout(function() {
        func.apply();
        return tyto;
      }, delay);
    };
    setUpLS = function() {
      return $('body').on('tyto:action', function(event) {
        if (tyto._autoSave) {
          return throttle(function() {
            return tyto.saveBarn();
          }, 5000);
        }
      });
    };
    if (window.localStorage && window.localStorage.tyto) {
      setUpLS();
    } else if (window.localStorage) {
      $('#cookie-banner').removeClass('hide').find('[data-action="cookie-close"]').on('click', function(e) {
        setUpLS();
        $('.cookie-banner').remove();
        $('#forkongithub').removeClass('hide');
        return tyto.saveBarn();
      });
    }
    return $('body').on('tyto:action', function(event) {
      tyto.undo.action = event.name;
      tyto.undo.column = event.DOMcolumn;
      tyto.undo.item = event.DOMitem;
      tyto.undo.columnIndex = event.columnIndex;
      tyto.undo.itemIndex = event.itemIndex;
      tyto.undo.editContent = event.content;
      return $('[data-action="undolast"]').removeAttr('disabled').removeClass('btn-disabled').addClass('btn-default');
    });
  };
  tyto.prototype._bindColumnEvents = function($column) {
    tyto = this;
    $column.find('.column-title').on('keydown', function(event) {
      var columnTitle;
      columnTitle = this;
      if (event.keyCode === 13 || event.charCode === 13 || event.keyCode === 27 || event.charCode === 27) {
        return columnTitle.blur();
      }
    });
    $column.find('.column-title').on('click', function(event) {
      return tyto._preEditItemContent = this.innerHTML.toString().trim();
    });
    $column.find('.column-title').on('blur', function(e) {
      return tyto.element.trigger({
        type: 'tyto:action',
        name: 'edit-column-title',
        DOMcolumn: $column,
        content: tyto._preEditItemContent
      });
    });
    $column.find('.items').sortable({
      connectWith: ".items",
      handle: ".item-mover",
      placeholder: "item-placeholder",
      containment: "#barn",
      opacity: 0.8,
      revert: true,
      start: function(event, ui) {
        var itemList;
        tyto._movedItem = $(ui.item);
        tyto._movedItemOrigin = $(event.currentTarget);
        itemList = Array.prototype.slice.call($column.find('.items').children('.tyto-item'));
        return tyto._movedItemIndex = itemList.indexOf($(ui.item)[0]);
      },
      stop: function(event, ui) {
        tyto.element.trigger({
          type: 'tyto:action',
          name: 'move-item',
          DOMcolumn: tyto._movedItemOrigin,
          DOMitem: tyto._movedItem,
          itemIndex: tyto._movedItemIndex
        });
        return tyto.notify('item moved', 2000);
      }
    });
    $column.find('[data-action="removecolumn"]').on('click', function(e) {
      return tyto.removeColumn($column);
    });
    $column.find('[data-action="additem"]').on('click', function(e) {
      return tyto.addItem($column);
    });
    return tyto;
  };
  tyto.prototype.undoLast = function() {
    tyto = this;
    if (tyto.undo) {
      switch (tyto.undo.action) {
        case 'add-column':
          tyto.undo.column.remove();
          tyto._resizeColumns();
          break;
        case 'add-item':
          tyto.undo.item.remove();
          break;
        case 'remove-column':
          if (tyto.undo.columnIndex > tyto.element.find('.column').length - 1) {
            tyto.element.append(tyto.undo.column);
          } else {
            $(tyto.element.find('.column')[tyto.undo.columnIndex]).before(tyto.undo.column);
          }
          tyto._bindColumnEvents(tyto.undo.column);
          $.each(tyto.undo.column.find('[data-tyto-item]'), function() {
            return tyto._binditemEvents($(this));
          });
          tyto._resizeColumns();
          break;
        case 'remove-item':
          if (tyto.undo.itemIndex > tyto.undo.column.find('[data-tyto-item]').length - 1) {
            tyto.undo.column.find('.items').append(tyto.undo.item);
          } else {
            $(tyto.element.find(tyto.undo.column).find('[data-tyto-item]')[tyto.undo.itemIndex]).before(tyto.undo.item);
          }
          tyto._binditemEvents(tyto.undo.item);
          break;
        case 'move-item':
          if (tyto.undo.itemIndex === 0 || tyto.undo.itemIndex === tyto.undo.column.children('.tyto-item').length) {
            tyto.undo.column.append(tyto.undo.item);
          } else {
            $(tyto.undo.column.children('.tyto-item')[tyto.undo.itemIndex]).before(tyto.undo.item);
          }
          break;
        case 'move-column':
          $(tyto.element.children('.column')[tyto.undo.itemIndex]).before(tyto.undo.column);
          break;
        case 'edit-item-title':
          tyto.undo.item.find('.tyto-item-title')[0].innerHTML = tyto.undo.editContent;
          break;
        case 'edit-item-content':
          tyto.undo.item.find('.tyto-item-content')[0].innerHTML = tyto.undo.editContent;
          break;
        case 'edit-column-title':
          tyto.undo.column.find('.column-title')[0].innerHTML = tyto.undo.editContent;
          break;
        case 'wipe-board':
          tyto.element.append(tyto.undo.item);
          $.each(tyto.element.find('.tyto-item'), function(key, $item) {
            return tyto._binditemEvents($($item));
          });
          $.each(tyto.element.find('.column'), function(key, $column) {
            return tyto._bindColumnEvents($($column));
          });
          break;
        default:
          console.log("tyto: no luck, you don't seem to be able to undo that");
      }
      $('[data-action="undolast"]').removeClass('btn-info').addClass('btn-disabled').attr('disabled', true);
      return tyto.notify('undone', 2000);
    }
  };
  tyto.prototype.addColumn = function() {
    tyto = this;
    if (tyto.element.find('.column').length < tyto.config.maxColumns) {
      tyto._createColumn();
      tyto._resizeColumns();
      return tyto.notify('column added', 2000);
    } else {
      return alert("whoah, it's getting busy and you've reached the maximum amount of columns. You can however increase the amount of maximum columns via the config.");
    }
  };
  tyto.prototype.removeColumn = function($column) {
    var calculateIndex, removeColumn;
    if ($column == null) {
      $column = this.element.find('.column').last();
    }
    tyto = this;
    calculateIndex = function() {
      var colIndex;
      colIndex = void 0;
      $.each($(".column"), function(key, value) {
        if ($column[0] === value) {
          colIndex = key;
          return false;
        }
      });
      return colIndex;
    };
    removeColumn = function() {
      var columnList;
      columnList = Array.prototype.slice.call($column.parent('[data-tyto]').children('.column'));
      tyto.element.trigger({
        type: 'tyto:action',
        name: 'remove-column',
        DOMitem: void 0,
        DOMcolumn: $column,
        columnIndex: columnList.indexOf($column[0])
      });
      $column.remove();
      return tyto._resizeColumns();
    };
    if ($column.find('.tyto-item').length > 0) {
      if (confirm('are you sure you want to remove this column? doing so will lose all items within it.')) {
        removeColumn();
        return tyto.notify('column removed', 2000);
      }
    } else {
      removeColumn();
      return tyto.notify('column removed', 2000);
    }
  };
  tyto.prototype.addItem = function($column, content) {
    if ($column == null) {
      $column = this.element.find('.column').first();
    }
    this._createItem($column, content);
    return this.notify('item added', 2000);
  };
  tyto.prototype._createItem = function($column, content) {
    var $newitem, template;
    tyto = this;
    template = Handlebars.compile(itemHtml);
    $newitem = $(template({}));
    tyto._binditemEvents($newitem);
    $column.find('.tyto-item-holder .items').append($newitem);
    return tyto.element.trigger({
      type: 'tyto:action',
      name: 'add-item',
      DOMitem: $newitem,
      DOMcolumn: $column
    });
  };
  tyto.prototype._binditemEvents = function($item) {
    tyto = this;
    $item.find('.close').on('click', function(event) {
      var itemList;
      if (confirm('are you sure you want to remove this item?')) {
        itemList = Array.prototype.slice.call($item.parent('.items').children());
        tyto.element.trigger({
          type: 'tyto:action',
          name: 'remove-item',
          DOMitem: $item,
          DOMcolumn: $item.parents('.column'),
          columnIndex: void 0,
          itemIndex: itemList.indexOf($item[0])
        });
        $item.remove();
        return tyto.notify('item removed', 2000);
      }
    });
    $item.find('i.collapser').on('click', function(e) {
      var icon;
      icon = $(this);
      icon.toggleClass('fa-minus fa-plus');
      return icon.closest('.tyto-item').find('.tyto-item-content').toggle();
    });
    $item.find('.tyto-item-title, .tyto-item-content').on('keydown', function(event) {
      var item;
      item = this;
      if (event.keyCode === 27 || event.charCode === 27) {
        return item.blur();
      }
    });
    $item.find('.tyto-item-title').on('click', function(event) {
      return tyto._preEditItemContent = this.innerHTML.toString().trim();
    });
    $item.find('.tyto-item-title').on('blur', function(e) {
      tyto.element.trigger({
        type: 'tyto:action',
        name: 'edit-item-title',
        DOMitem: $item,
        content: tyto._preEditItemContent
      });
      return tyto.notify('item title edited', 2000);
    });
    $item.find('.tyto-item-content').on('click', function(event) {
      return tyto._preEditItemContent = this.innerHTML.toString().trim();
    });
    return $item.find('.tyto-item-content').on('blur', function(e) {
      tyto.element.trigger({
        type: 'tyto:action',
        name: 'edit-item-content',
        DOMitem: $item,
        content: tyto._preEditItemContent
      });
      return tyto.notify('item content edited', 2000);
    });
  };
  tyto.prototype.saveBarn = function() {
    window.localStorage.setItem('tyto', JSON.stringify(tyto._createBarnJSON()));
    return this.notify('board saved', 2000);
  };
  tyto.prototype.deleteSave = function() {
    window.localStorage.removeItem('tyto');
    return this.notify('save deleted', 2000);
  };
  tyto.prototype._bindActions = function() {
    var action, actionMap;
    tyto = this;
    actionMap = {
      additem: 'addItem',
      addcolumn: 'addColumn',
      exportbarn: 'exportBarn',
      loadbarn: 'loadBarn',
      emailbarn: 'emailBarn',
      helpbarn: 'showHelp',
      infobarn: 'showInfo',
      undolast: 'undoLast',
      savebarn: 'saveBarn',
      deletesave: 'deleteSave',
      wipeboard: 'wipeBoard',
      toggleautosave: 'toggleAutoSave'
    };
    action = "";
    return $('.actions').on('click', '[data-action]', function(e) {
      action = e.target.dataset.action;
      return tyto[actionMap[action]]();
    });
  };
  tyto.prototype.wipeBoard = function() {
    var boardContent;
    if (confirm('are you really sure you wish to wipe your entire board?')) {
      boardContent = tyto.element[0].innerHTML;
      tyto.element[0].innerHTML = '';
      tyto.element.trigger({
        type: 'tyto:action',
        name: 'wipe-board',
        DOMitem: $(boardContent)
      });
      return tyto.notify('board wiped', 2000);
    }
  };
  tyto.prototype.toggleAutoSave = function() {
    $('[data-action="toggleautosave"] i').toggleClass('fa-check-square-o fa-square-o');
    tyto._autoSave = !tyto._autoSave;
    if (tyto._autoSave) {
      tyto.notify('auto-save: ON', 2000);
    } else {
      tyto.notify('auto-save: OFF', 2000);
    }
    return window.localStorage.setItem('tyto', JSON.stringify(tyto._createBarnJSON()));
  };
  tyto.prototype._resizeColumns = function() {
    var correctWidth;
    tyto = this;
    if (tyto.element.find('.column').length > 0) {
      correctWidth = 100 / tyto.element.find('.column').length;
      return tyto.element.find('.column').css({
        'width': correctWidth + '%'
      });
    }
  };
  tyto.prototype._createBarnJSON = function() {
    var columns, itemboardJSON;
    tyto = this;
    itemboardJSON = {
      autoSave: tyto._autoSave,
      showIntroModalOnLoad: tyto.config.showIntroModalOnLoad,
      introModalId: tyto.config.introModalId,
      helpModalId: tyto.config.helpModalId,
      infoModalId: tyto.config.infoModalId,
      emailSubject: tyto.config.emailSubject,
      emailRecipient: tyto.config.emailRecipient,
      DOMId: tyto.config.DOMId,
      DOMElementSelector: tyto.config.DOMElementSelector,
      saveFilename: tyto.config.saveFilename,
      maxColumns: tyto.config.maxColumns,
      columns: []
    };
    columns = tyto.element.find('.column');
    $.each(columns, function(index, column) {
      var columnTitle, columnitems, items;
      columnTitle = $(column).find('.column-title')[0].innerHTML.toString().trim();
      items = [];
      columnitems = $(column).find('.tyto-item');
      $.each(columnitems, function(index, item) {
        var isCollapsed;
        isCollapsed = item.querySelector('.action-icons .collapser').className.indexOf('plus') !== -1 ? true : false;
        return items.push({
          content: item.querySelector('.tyto-item-content').innerHTML.toString().trim(),
          title: item.querySelector('.tyto-item-title').innerHTML.toString().trim(),
          collapsed: isCollapsed
        });
      });
      return itemboardJSON.columns.push({
        title: columnTitle,
        items: items
      });
    });
    return itemboardJSON;
  };
  tyto.prototype._loadBarnJSON = function(json) {
    return tyto._buildDOM(json);
  };
  tyto.prototype.exportBarn = function() {
    var content, filename, saveAnchor;
    tyto = this;
    saveAnchor = $('#savetyto');
    filename = tyto.config.saveFilename !== undefined ? tyto.config.saveFilename + '.json' : 'itemboard.json';
    content = 'data:text/plain,' + JSON.stringify(tyto._createBarnJSON());
    saveAnchor[0].setAttribute('download', filename);
    saveAnchor[0].setAttribute('href', content);
    return saveAnchor[0].click();
  };
  tyto.prototype.loadBarn = function() {
    var $files;
    tyto = this;
    $files = $('#tytofiles');
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      $files[0].click();
    } else {
      alert('tyto: the file APIs are not fully supported in your browser');
    }
    return $files.on('change', function(event) {
      var f, reader;
      f = event.target.files[0];
      if ((f.type.match('application/json')) || (f.name.indexOf('.json' !== -1))) {
        reader = new FileReader();
        reader.onloadend = function(event) {
          var result;
          result = JSON.parse(this.result);
          if (result.columns !== undefined && (result.DOMId !== undefined || result.DOMElementSelector !== undefined)) {
            return tyto._loadBarnJSON(result);
          } else {
            return alert('tyto: incorrect json');
          }
        };
        return reader.readAsText(f);
      } else {
        return alert('tyto: only load a valid itemboard json file');
      }
    });
  };
  tyto.prototype._getEmailContent = function() {
    var $email, contentString, itemboardJSON, regex, template;
    tyto = this;
    contentString = '';
    itemboardJSON = tyto._createBarnJSON();
    template = Handlebars.compile(emailHtml);
    $email = $(template(itemboardJSON));
    regex = new RegExp('&lt;br&gt;', 'gi');
    if ($email.html().trim() === "Here are your current items.") {
      return "You have no items on your plate so go grab a glass and fill up a drink! :)";
    } else {
      return $email.html().replace(regex, '').trim();
    }
  };
  tyto.prototype.emailBarn = function() {
    var content, d, mailto, mailtoString, recipient, subject;
    tyto = this;
    mailto = 'mailto:';
    recipient = tyto.config.emailRecipient ? tyto.config.emailRecipient : 'someone@somewhere.com';
    d = new Date();
    subject = tyto.config.emailSubject ? tyto.config.emailSubject : 'items as of ' + d.toString();
    content = tyto._getEmailContent();
    content = encodeURIComponent(content);
    mailtoString = mailto + recipient + '?subject=' + encodeURIComponent(subject.trim()) + '&body=' + content;
    $('#tytoemail').attr('href', mailtoString);
    return $('#tytoemail')[0].click();
  };
  tyto.prototype.notify = function(message, duration) {
    var $message;
    $message = $('<div class= "tyto-notification notify" data-tyto-notify=" ' + (duration / 1000) + ' ">' + message + '</div>');
    $('body').prepend($message);
    return setTimeout(function() {
      return $message.remove();
    }, duration);
  };
  tyto.prototype.showHelp = function() {
    tyto = this;
    if (tyto.config.helpModalId) {
      tyto.modals.helpModal = $('#' + tyto.config.helpModalId);
      return tyto.modals.helpModal.modal();
    }
  };
  tyto.prototype.showInfo = function() {
    tyto = this;
    if (tyto.config.infoModalId) {
      tyto.modals.infoModal = $('#' + tyto.config.infoModalId);
      return tyto.modals.infoModal.modal();
    }
  };
  return tyto;
});
