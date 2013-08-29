(function(root, $, Backbone, undefined) {
  'use strict';

  root.App = {};

  App.Product = Backbone.Model.extend({
    defaults: {
      'name': '',
      'img' : '',
      'brand': '',
      'merchant': '',
      'url' : '/',
      'listPrice' : '0.00',
      'salePrice' : '0.00',
      'editorsPick' : false,
      'sale': false
    }
  });

  App.Products = Backbone.Collection.extend({
    url: '/products.json',
    model: App.Product,
    parse: function(response) {
      return response.products;
    }
  });

  App.CartItem = Backbone.Model.extend({
    defaults: {
      quantity: 0,
      total: 0.0,
      product: null
    }
  });

  App.CartItems = Backbone.Model.extend({
    model: App.CartItem
  });

  App.Cart = Backbone.Model.extend({
    url: '/cart.json',

    initialize: function() {
      this.cartItems = new App.CartItems();
      this.selectedShippingMethod = null;
    },

    parse: function(response) {
      this.cartItems = new App.CartItems(response.cart.items);

      var cartData = response.cart.totals;

      cartData.shipping_methods = response.cart.shippingmethods;
      
      return cartData;
    }
  });

  App.ApplicationView = Backbone.View.extend({
    el: '#application',
    template: _.template($('script[data-template-name="application"]').html()),
    initialize: function() {
      this.render();
    },
    render: function() {
      this.$el.html(this.template());
    }
  });

  App.ProductsListView = Backbone.View.extend({
    template: _.template($('script[data-template-name="products"]').html()),

    events: {
      'change #search': 'filterCollection',
      'keyup #search': 'filterCollection'
    },

    initialize: function() {
      this.productViews = {};
      this.filteredCollection = this.collection.clone();
      this.listenTo(this.collection, 'reset', this.applyFilters);
      this.listenTo(this.collection, 'add', this.applyFilters);
      this.listenTo(this.collection, 'remove', this.productRemoved);
    },

    render: function() {
      this.$el.html(this.template());
      this.memoizeDOM();
      this.renderProducts();
      return this;
    },

    memoizeDOM: function() {
      this.$productsList = this.$('#products-list');
    },

    renderProducts: function() {
      var self = this;
      this.$productsList.empty();
      this.filteredCollection.each(function(product) {
        self.renderProduct(product);
      });
    },

    renderProduct: function(product) {
      var view = this.productViews[product.cid];
      if(!view) {
        view = new App.ProductsListItemView({model: product});
        this.productViews[product.cid] = view.render();
      }
      this.$productsList.append(view.el);
    },

    filterCollection: function() {
      var term = this.$('#search').val();
      
      if(term && term !== '') {
        term = new RegExp(term, 'ig');

        this.filteredCollection = this.collection.filter(function(product) {
          var name      = product.get('name').match(term);
          var brand     = product.get('brand').match(term);
          var merchant  = product.get('merchant').match(term);

          return name || brand || merchant;
        });
        this.filteredCollection = new App.Products(this.filteredCollection);
      } else {
        this.filteredCollection = this.collection.clone();
      }

      this.renderProducts();
    },

    applyFilters: function() {
      this.filteredCollection = this.collection.clone();
      this.filterCollection();
    },

    productRemoved: function(product) {
      this.productViews[product.cid].leave();
      delete this.productViews[product.cid];
      this.applyFilters();
    },

    leave: function() {
      this.productViews.each(function(v) {
        v.leave();
      });
      this.unbind();
      this.remove();
    }
  });

  App.ProductsListItemView = Backbone.View.extend({
    className: 'product',

    template: _.template($('script[data-template-name="product"]').html()),

    initialize: function() {
      // Why you don't need two-way binding!
      // this is just an illustration of why, this data is most likely not going to change
      this.listenTo(this.model, 'change:img', this.renderImg);
      this.listenTo(this.model, 'change:name', this.renderName);
      this.listenTo(this.model, 'change:brand', this.renderBrand);
      this.listenTo(this.model, 'change:merchant', this.renderMerchant);
      this.listenTo(this.model, 'change:listPrice', this.renderPrices);
      this.listenTo(this.model, 'change:salePrice', this.renderPrices);
      this.listenTo(this.model, 'change:sale', this.renderSale);
      this.listenTo(this.model, 'change:editorsPick', this.renderEditorsPick);
    },

    render: function() {
      this.$el.html(this.template());

      this.memoizeDOM();

      this.renderImg();
      this.renderName();
      this.renderBrand();
      this.renderMerchant();
      this.renderPrices();
      this.renderSale();
      this.renderEditorsPick();

      return this;
    },

    memoizeDOM: function() {
      this.$productImage = this.$('.product-image');
      this.$productName = this.$('.product-name');
      this.$productBrand = this.$('.product-brand');
      this.$productMerchant = this.$('.product-merchant');
      this.$listPrice = this.$('.list-price');
      this.$salePrice = this.$('.sale-price');
      this.$productSale = this.$('.product-sale');
      this.$productEditor = this.$('.product-editor');
    },

    renderImg: function() {
      this.$productImage.attr('src', this.model.get('img'));
    },

    renderName: function() {
      this.$productName.text(this.model.get('name'))
    },

    renderBrand: function() {
      this.$productBrand.text(this.model.get('brand'));
    },

    renderMerchant: function() {
      this.$productMerchant.text(this.model.get('merchant'));
    },

    renderPrices: function() {
      this.$listPrice.text(this.model.get('listPrice'));
      this.$salePrice.text(this.model.get('salePrice'));
    },

    renderSale: function() {
      if(this.model.get('sale')) {
        this.$listPrice.addClass('list-price-on-sale');
        this.$productSale.removeClass('hide');
        this.$salePrice.removeClass('hide');
      } else {
        this.$listPrice.removeClass('list-price-on-sale');
        this.$productSale.addClass('hide');
        this.$salePrice.addClass('hide');
      }
    },

    renderEditorsPick: function() {
      if(this.model.get('editorsPick')) {
        this.$productEditor.removeClass('hide');
      } else {
        this.$productEditor.addClass('hide');
      }
    },

    leave: function() {
      this.unbind();
      this.remove();
    }
  });

  App.CartView = Backbone.View.extend({
    template: _.template($('script[data-template-name="cart"]').html()),

    render: function() {
      this.$el.html(this.template());
      return this;
    }
  });

  App.initialize = function() {
    new App.ApplicationView();

    App.products = new App.Products();
    App.cart = new App.Cart();

    App.products.fetch().
      done(function() {
        var view = new App.ProductsListView({collection: App.products});
        $('#products').html(view.render().el);
      });

    /*App.cart.fetch().
      done(function() {
        var cartView = new App.CartView({model: App.cart});
        $('#cart').html(cartView.render().el);
      });*/
  };

})(this, jQuery, Backbone);

$(function() { App.initialize(); });

function duplicate1() {
  $('.product').on('click', function() { alert('Hello from product') });
}

function duplicate2() {
  $('.product').on('click', function() { alert('Hello from product') });
}