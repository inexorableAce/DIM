(function() {
  'use strict';

  angular.module('dimApp').directive('dimCompare', Compare);

  Compare.$inject = [];

  function Compare() {
    return {
      controller: CompareCtrl,
      controllerAs: 'vm',
      bindToController: true,
      scope: {},
      template: `
        <div id="loadout-drawer" ng-if="vm.show">
          <p>
            <label ng-if="vm.archeTypes.length > 1" class="dim-button" ng-click="vm.compareSimilar('archetype')" translate="{{ vm.compare.location.inWeapons ? 'Compare.Archetype' : 'Compare.Splits'}}" translate-values="{ quantity:  vm.archeTypes.length }"></label>
            <label ng-if="vm.similarTypes.length > 1" class="dim-button" ng-click="vm.compareSimilar()" translate="Compare.All" translate-values="{ type: vm.compare.typeName, quantity: vm.similarTypes.length}"></label>
            <label class="dim-button" ng-click="vm.cancel()" translate>Compare.Close</label>
          </p>
          <!-- TODO: css hover -->
          <div class="compare-bucket" ng-mouseleave="vm.highlight = null">
            <span class="compare-item fixed-left">
              <!-- TODO: get rid of this, use a table! -->
              <div>&nbsp;</div>
              <div>&nbsp;</div>
              <div ng-class="{highlight: vm.highlight === vm.comparisons[0].primStat.statHash, sorted: vm.sortedHash === vm.comparisons[0].primStat.statHash}" ng-mouseover="vm.highlight = vm.comparisons[0].primStat.statHash" ng-click="vm.sort(vm.comparisons[0].primStat.statHash)" ng-bind="vm.comparisons[0].primStat.stat.statName"></div>
              <div ng-class="{highlight: vm.highlight === stat.statHash, sorted: vm.sortedHash === stat.statHash}" ng-mouseover="vm.highlight = stat.statHash" ng-click="vm.sort(stat.statHash)" ng-repeat="stat in vm.comparisons[0].stats track by stat.statHash" ng-bind="::stat.name"></div>
            </span>
            <span ng-repeat="item in vm.comparisons track by item.id" class="compare-item">
              <dim-item-tag ng-if="vm.featureFlags.tagsEnabled" item="item"></dim-item-tag>
              <div ng-bind="::item.name" class="item-name"></div>
              <div ng-class="{highlight: vm.highlight === item.primStat.stat.statHash}" ng-mouseover="vm.highlight = item.primStat.statHash" ng-click="vm.sort(item.primStat.statHash)">
                <span ng-bind="item.primStat.value"></span>
              </div>
              <div ng-class="{highlight: vm.highlight === stat.statHash}" ng-mouseover="vm.highlight = stat.statHash" ng-click="vm.sort(stat.statHash)" ng-repeat="stat in item.stats track by $index" ng-style="vm.compare.location.inWeapons ? (stat.value === vm.statRanges[stat.statHash].max ? 100 : (100 * stat.value - vm.statRanges[stat.statHash].min) / vm.statRanges[stat.statHash].max) : (stat.qualityPercentage.min) | qualityColor:'color'">
                <span ng-bind="::stat.value"></span>
                <span ng-if="stat.value && stat.qualityPercentage.range" class="range">({{::stat.qualityPercentage.range}})</span>
              </div>
              <div ng-repeat="node in vm.talentGrids[item.id].nodes" title="{{node.description}}">
               {{node.name}}
              </div>
              <div class="close" ng-click="vm.remove(item);"></div>
            </span>
          </div>
        </div>
      `
    };
  }

  CompareCtrl.$inject = ['$scope', 'toaster', 'dimCompareService', 'dimItemService', 'dimFeatureFlags', '$translate'];

  function CompareCtrl($scope, toaster, dimCompareService, dimItemService, dimFeatureFlags, $translate) {
    var vm = this;
    vm.featureFlags = dimFeatureFlags;
    vm.show = dimCompareService.dialogOpen;

    vm.comparisons = [];
    vm.statRanges = {};

    $scope.$on('dim-store-item-compare', function(event, args) {
      vm.show = true;
      dimCompareService.dialogOpen = true;

      vm.add(args);
    });

    vm.cancel = function cancel() {
      vm.comparisons = [];
      vm.statRanges = {};
      vm.similarTypes = [];
      vm.archeTypes = [];
      vm.highlight = null;
      vm.sortedHash = null;
      vm.show = false;
      dimCompareService.dialogOpen = false;
    };

    vm.compareSimilar = function(type) {
      vm.comparisons = _.union(vm.comparisons, type === 'archetype' ? vm.archeTypes : vm.similarTypes);
    };

    vm.sort = function(statHash) {
      vm.sortedHash = statHash;
      vm.comparisons = _.sortBy(_.sortBy(_.sortBy(vm.comparisons, 'index'), 'name').reverse(), function(item) {
        return _.findWhere(item.stats, { statHash: statHash }).value;
      }).reverse();
    };

    vm.add = function add(args) {
      if (!args.item.talentGrid || !args.item.equipment) {
        return;
      }

      if (vm.comparisons.length && vm.comparisons[0].typeName && args.item.typeName !== vm.comparisons[0].typeName) {
        if (vm.comparisons[0].classType && args.item.classType !== vm.comparisons[0].classType) {
          toaster.pop('warning', args.item.name, $translate.instant(Compare.Error.Class, vm.comparisons[0].classType));
          return;
        }
        toaster.pop('warning', args.item.name, $translate.instant(Compare.Error.Archetype, vm.comparisons[0].typeName));
        return;
      }

      if (args.dupes) {
        vm.compare = args.item;
        vm.similarTypes = _.where(dimItemService.getItems(), { typeName: vm.compare.typeName });
        var armorSplit;
        if (!vm.compare.location.inWeapons) {
          vm.similarTypes = _.where(vm.similarTypes, { classType: vm.compare.classType });
          armorSplit = _.reduce(vm.compare.stats, function(memo, stat) {
            return memo + (stat.base === 0 ? 0 : stat.statHash);
          }, 0);
        }

        vm.archeTypes = _.filter(vm.similarTypes, function(item) {
          if (item.location.inWeapons) {
            var arch = _.find(item.stats, { statHash: vm.compare.stats[0].statHash });
            if (!arch) {
              return false;
            }
            return arch.base === _.find(vm.compare.stats, { statHash: vm.compare.stats[0].statHash }).base;
          }
          return _.reduce(item.stats, function(memo, stat) {
            return memo + (stat.base === 0 ? 0 : stat.statHash);
          }, 0) === armorSplit;
        });
        vm.comparisons = _.where(dimItemService.getItems(), { hash: vm.compare.hash });
      } else if (!_.findWhere(vm.comparisons, { hash: args.item.hash, id: args.item.id })) {
        vm.comparisons.push(args.item);
      }
    };

    vm.remove = function remove(item) {
      vm.comparisons = vm.comparisons.filter(function(compare) {
        return compare.index !== item.index;
      });

      if (!vm.comparisons.length) {
        vm.cancel();
        return;
      }
    };

    $scope.$watch('vm.comparisons', function() {
      var statBuckets = {};

      _.each(vm.comparisons, function(item) {
        _.each(item.stats, function(stat) {
          (statBuckets[stat.statHash] = statBuckets[stat.statHash] || []).push(stat.value);
        });
      });

      vm.statRanges = {};
      _.each(statBuckets, function(bucket, hash) {
        const statRange = {
          min: Math.min(...bucket),
          max: Math.max(...bucket)
        };
        statRange.enabled = statRange.min !== statRange.max;
        vm.statRanges[hash] = statRange;
      });

      const nodeCounts = {};
      vm.talentGrids = {};
      _.each(vm.comparisons, (item) => {
        _.each(item.talentGrid.nodes, (node) => {
          if (!nodeCounts[node.hash]) {
            nodeCounts[node.hash] = 0;
          }
          nodeCounts[node.hash]++;
        });
      });

      const commonNodes = new Set();
      _.each(nodeCounts, (count, hash) => {
        if (count === vm.comparisons.length) {
          commonNodes.add(hash);
        }
      });

      vm.talentGrids = {};
      _.each(vm.comparisons, (item) => {
        vm.talentGrids[item.id] = trimTalentGrid(item.talentGrid, commonNodes, nodeCounts);
      });
    }, true);

    function trimTalentGrid(talentGrid, commonNodes, nodeCounts) {
      const trimmedGrid = angular.copy(talentGrid);
      trimmedGrid.nodes = _.reject(trimmedGrid.nodes, (n) => commonNodes.has(n.hash.toString()));
      if (trimmedGrid.nodes.length) {
        return trimmedGrid;
      } else {
        return null;
      }
    }
  }
})();
