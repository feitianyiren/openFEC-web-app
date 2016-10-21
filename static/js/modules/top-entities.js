'use strict';

var $ = require('jquery');
var _ = require('underscore');
var helpers = require('../modules/helpers');
var moment = require('moment');

var TOP_ROW = _.template(
  '<div role="row" class="simple-table__row js-top-row">' +
    '<div class="simple-table__cell">{{ rank }}. <a href="{{ url }}">{{ name }}</a> {{ party_code }}</div>' +
    '<div class="simple-table__cell t-right-aligned">{{ amount }}</div>' +
    '<div class="simple-table__cell"><div class="bar-container">' +
      '<div class="value-bar" data-value="{{ value }}" data-party="{{ party }}"></div>' +
    '</div></div>',
    {interpolate: /\{\{(.+?)\}\}/g}
);

// Store candidate office letters for to look up when a chart category is a candidate
var candidateCategories = ['P', 'S', 'H'];

function TopEntities(elm, type) {
  this.$elm = $(elm);
  this.type = type;
  this.category = this.$elm.data('category');
  this.cycle = this.$elm.data('cycle');

  this.$table = this.$elm.find('.js-top-table');
  this.$dates = this.$elm.find('.js-dates');
  this.$previous = this.$elm.find('.js-previous');
  this.$next = this.$elm.find('.js-next');
  this.$pageInfo = this.$elm.find('.js-page-info');
  this.init();

  $('.js-cycle').on('change', this.handleCycleChange.bind(this));
  this.$elm.find('.js-category').on('change', this.handleCategoryChange.bind(this));
  this.$elm.find('.js-previous').on('click', this.handlePagination.bind(this, 'previous'));
  this.$elm.find('.js-next').on('click', this.handlePagination.bind(this, 'next'));
}

TopEntities.prototype.init = function() {
  if (candidateCategories.indexOf(this.category) > -1) {
    this.basePath = ['candidates', 'totals'];
  } else {
    this.basePath = ['totals', this.category];
  }
  this.baseQuery = {
    sort: '-' + this.type,
    per_page: 10,
    sort_hide_null: true,
    cycle: this.cycle
  };
  this.maxValue = Number(this.$table.find('.value-bar').first().data('value'));

  // Store the current query for use in pagination and more
  this.currentQuery = this.baseQuery;

  // If it's a candidate table, add the office to the current query
  if (candidateCategories.indexOf(this.category) > -1) {
    this.office = this.category;
    this.currentQuery.office = this.office;
    this.category = 'candidates';
  }

  if (!this.currentQuery.page) {
    this.$previous.addClass('is-disabled');
  }

  this.drawBars();
};

TopEntities.prototype.handleCycleChange = function(e) {
  e.preventDefault();
  this.cycle = e.target.value;
  if (this.category === 'candidates') {
      this.currentQuery = _.extend({}, this.baseQuery, {
      cycle: this.cycle,
      office: this.office,
      page: 1
    });
  } else {
    this.currentQuery = _.extend({}, this.baseQuery, {
      cycle: this.cycle,
      page: 1
    });
  }
  this.loadData(this.currentQuery);
  this.updateDates();
};

TopEntities.prototype.handleCategoryChange = function(e) {
  e.preventDefault();
  var category = e.target.value;
  if (candidateCategories.indexOf(category) > -1) {
    this.basePath = ['candidates', 'totals'];
    this.category = 'candidates';
    this.office = category;
    this.currentQuery = _.extend({}, this.baseQuery, {
      office: this.office,
      cycle: this.cycle,
      page: 1
    });
   } else {
    this.basePath = ['totals', category];
    this.category = category;
    this.currentQuery = _.extend({}, this.baseQuery, {
      cycle: this.cycle,
      page: 1
    });
  }
  this.loadData(this.currentQuery);
};

TopEntities.prototype.handlePagination = function(direction) {
  var currentPage = this.currentQuery.page || 1;
  if (direction === 'next') {
    this.currentQuery.page = currentPage + 1;
    this.$previous.removeClass('is-disabled');
  } else if (direction === 'previous' && currentPage > 1) {
    this.currentQuery.page = currentPage - 1;
  } else {
    return;
  }

  this.loadData(this.currentQuery);
};

TopEntities.prototype.loadData = function(query) {
  var self = this;
  $.getJSON(
    helpers.buildUrl(this.basePath, query)
  ).done(function(response) {
    self.populateTable(response);
  });
};

TopEntities.prototype.populateTable = function(response) {
  var self = this;
  self.$table.find('.js-top-row').remove();
  var index = 1;
  var rankBase = (response.pagination.page - 1) * 10; // So that page 2 starts at 11
  _.each(response.results, function(result) {
    var rank = rankBase + index;
    var data = self.formatData(result, rank);
    self.$table.append(TOP_ROW(data));
    index++;
  });

  // Set max value if it's the first page
  if (response.pagination.page === 1) {
    self.maxValue = response.results[0].receipts;
    self.$previous.addClass('is-disabled');
  }
  self.updatePagination(response.pagination);
  self.drawBars();
};

TopEntities.prototype.formatData = function(result, rank) {
  var data;
  if (this.category === 'candidates') {
    data = {
      name: result.name,
      amount: helpers.currency(result[this.type]),
      value: result[this.type],
      rank: rank,
      party: result.party,
      party_code: '[' + result.party.charAt('0').toUpperCase() + ']',
      url: helpers.buildAppUrl(['candidate', result.candidate_id], {
        cycle: this.cycle,
        election_full: false
      })
    };
  } else {
    data = {
      name: result.committee_name,
      amount: helpers.currency(result[this.type]),
      value: result[this.type],
      rank: rank,
      party: '',
      party_code: '',
      url: helpers.buildAppUrl(['committee', result.committee_id], {
        cycle: this.cycle
      })
    };
  }

  return data;
};

TopEntities.prototype.drawBars = function() {
  var maxValue = this.maxValue;
  this.$table.find('.value-bar').each(function(){
    var width = Number(this.getAttribute('data-value')) / maxValue;
    this.style.width = String(width * 100) + '%';
  });
};

TopEntities.prototype.updateDates = function() {
  var today = new Date();
  var startDate = '01/01/' + String(this.cycle - 1);
  var endDate = this.cycle !== today.getFullYear() ? '12/31/' + this.cycle : moment(today, 'DD/MM/YYYY');
  this.$dates.html(startDate + '–' + endDate);
};

TopEntities.prototype.updatePagination = function(pagination) {
    var page = pagination.page;
    var per_page = pagination.per_page;
    var count = pagination.count.toLocaleString();
    var range_start = String(per_page * (page - 1) + 1);
    var range_end = String((page - 1) * 10 + per_page);
    var info = range_start + '-' + range_end + ' of ' + count;
    this.$pageInfo.html(info);
};

module.exports = {TopEntities: TopEntities};
