resource('app/basis_modules.js').fetch();

basis.require('basis.dom');
basis.require('basis.dom.event');
basis.require('basis.layout');
basis.require('app.stat');
basis.require('app.core');
basis.require('basis.l10n');

basis.l10n.setCultureList('en-US/ru-RU ru-RU'); // en-US temporary fallback on ru-RU
//basis.l10n.setCulture('ru-RU');

basis.ready(function(){
  var initTime = new Date;

  // import names
  var Event = basis.dom.event;
  var VerticalPanelStack = basis.layout.VerticalPanelStack;

  //
  // main part
  //
  var prototypeMapPopup = resource('app/layout/prototypeMapPopup.js');

  var targetHeader = resource('app/layout/targetHeader.js')();
  var targetContent = resource('app/layout/targetContent.js')();

  targetHeader.setDelegate(targetContent);
  targetHeader.setDataSource(targetContent.getChildNodesDataset());

  var navTree = resource('app/layout/navTree.js')();
  var searchTree = resource('app/layout/searchTree.js')();

  navTree.selection.addHandler({
    itemsChanged: function(){
      var selected = this.pick();
      targetContent.setDelegate(selected);
      document.title = 'Basis API' + (selected ? ': ' + selected.data.title + (selected.data.path ? ' @ ' + selected.data.path : '') : '');
    }
  });

  searchTree.selection.addHandler({
    itemsChanged: function(){
      var item = this.pick();
      if (item)
        navTree.open(item.data.fullPath);
    }
  });

  var sidebarPages = new basis.ui.tabs.PageControl({
    childNodes: [
      {
        name: 'tree',
        childNodes: navTree
      },
      {
        name: 'search',
        childNodes: searchTree
      }
    ]
  });

  //
  // search input
  //
  var searchInput = resource('app/layout/searchInput.js')();
  searchInput.matchFilter.node = searchTree;
  searchInput.matchFilter.addHandler({
    change: function(sender, oldValue){
      if (this.value)
      {
        if (!oldValue)
        {
          searchCloud.setSource(app.core.searchIndex);
          sidebarPages.item('search').select();
        }

        searchTree.setDataSource(searchCloud.getSubset(this.value.charAt(0).toUpperCase()));
      }
      else
      {
        sidebarPages.item('tree').select();
        var selected = navTree.selection.pick();
        if (selected)
          selected.element.scrollIntoView(true);
      }
    }
  });

  var searchCloud = new basis.data.dataset.Cloud({
    ruleEvents: false,
    rule: function(obj){
      return obj.data.title
        .replace(/(?:^|[\.\_])?([A-Z])(?:[A-Z]+|[a-z]+)|(?:^|[\.\_])?(?:([a-z])[a-z]+|([A-Z])[A-Z]+)|[^a-zA-Z]/g, '$1$2$3')
        .toUpperCase()
        .split('');
    }
  });

  //
  // Layout
  //

  new VerticalPanelStack({
    container: basis.dom.get('Layout'),
    template: '<b:include src="basis.layout.Stack" id="Sidebar"/>',
    childNodes: [
      {
        template: '<b:include src="basis.layout.Panel" id="Toolbar"/>',
        childNodes: searchInput
      },
      {
        template: '<b:include src="basis.layout.Panel" id="SidebarContent"/>',
        flex: 1,
        childNodes: sidebarPages
      }
    ]
  });

  var contentLayout = new VerticalPanelStack({
    container: basis.dom.get('Layout'),
    template: '<b:include src="basis.layout.Stack" id="Content"/>',
    childNodes: [
      {
        template: '<b:include src="basis.layout.Panel" id="ContentHeader"/>',
        content: targetHeader.element
      },
      { 
        flex: 1,
        content: targetContent.element
      }
    ]
  });

  //
  // scrolling
  //
  targetContent.scrollTo = smoothScroll(contentLayout.lastChild.element);

  function smoothScroll(element){
    var thread = new basis.animation.Thread({
      duration: 350,
      interval: 15
    });
    var modificator = new basis.animation.Modificator(thread, function(value){
      element.scrollTop = parseInt(value);
    }, 0, 0, true);

    modificator.timeFunction = function(value){
      return Math.sin(Math.acos(1 - value));
    };

    return function(relElement, jump){
      var curScrollTop = element.scrollTop;
      modificator.setRange(curScrollTop, curScrollTop);
      thread.stop();
      if (jump)
        element.scrollTop = relElement.offsetTop;
      else
      {
        modificator.setRange(curScrollTop, relElement.offsetTop);
        thread.start();
      }
    };
  }

  //
  // Global events
  //
  basis.dom.event.addGlobalHandler('click', function(e){
    if (!event.mouseLeft)
      return;
    
    var sender = event.sender;

    if (sender.tagName != 'A')
      sender = basis.dom.findAncestor(sender, function(node){ return node.tagName == 'A'; });

    if (sender && sender.pathname == location.pathname && sender.hash != '')
      navTree.open(sender.hash, basis.dom.parentOf(navTree.element, sender));
  });

  basis.dom.event.addGlobalHandler('keydown', function(event){
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || prototypeMapPopup().visible)
      return;

    searchInput.focus(!searchInput.focused);
  });

  searchInput.focus(true);

  app.stat.initTime.set(new Date - initTime);
});
