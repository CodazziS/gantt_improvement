/*---------------------------------------------------------
 * OpenERP gantt_improvement
 *---------------------------------------------------------*/
openerp.gantt_improvement = function (instance) {
    var _t = instance.web._t,
        _lt = instance.web._lt,
        QWeb = instance.web.qweb,
        attrs = null,
        last_r = null;

    instance.web.views.add('gantt', 'instance.gantt_improvement.GanttView');

    instance.gantt_improvement.GanttView = instance.web.View.extend({
        /* Defines */
        gantt_improvement_id: null,                 // ID for dhtmlx
        
        def_already_loaded: false,                  // If gantt has already loaded

        def_last_domains: null,                     // use for do_search, for reload
        def_last_contexts: null,                    // use for do_search, for reload
        def_last_group_bys: null,                   // use for do_search, for reload

        def_items_ids: null,                        // Use in draw_gantt contains all items ids
        def_items: null,                            // Use in draw_gantt containx all items

        def_gantt_date_start: new Date(2015,0,1),   // Dates start for Gantt: Reset in init function
        def_gantt_date_end: new Date(2016,0,1),     // Dates stop for Gantt: Reset in init function
        def_gantt_scale: 1,                         // Gantt scale (Day, week, month, year)

        /* Odoo vars */
        display_name: _lt('Gantt'),
        template: "GanttView",
        view_type: "gantt",
        
        /* Events */
        events: {
            'click .gantt_improvement_scale' : 'reset_scale',
            'click #gantt_i_search_btn' : 'reload_button',
        },

        /* Functions */
        init: function () {
            this._super.apply(this, arguments);
            this.gantt_improvement_id = _.uniqueId();

            /* init dates with defaults values */
        },

        view_loading: function(r) {
            this.last_r = r;
            this.attrs = r.arch.attrs;
        },

        reload: function() {
            this.view_loading(this.last_r);
            return this.do_search(this.def_last_domains, this.def_last_contexts, this.def_last_group_bys);
        },

        do_search: function (domains, contexts, group_bys) {
            var filter = [],
                self = this;

            this.def_last_domains = domains;
            this.def_last_contexts = contexts;
            this.def_last_group_bys = group_bys;
            this.reload_gantt();
            
            if (this.attrs.date_stop !== undefined) {
                // We know end date
                filter = [
                    '&',
                        '&',
                            '|',
                                '|',
                                    '&',
                                        [this.attrs.date_start, '>=', this.def_gantt_date_start],
                                        [this.attrs.date_start, '<=', this.def_gantt_date_end],
                                    '&',
                                        [this.attrs.date_stop, '>=', this.def_gantt_date_start],
                                        [this.attrs.date_stop, '<=', this.def_gantt_date_end],
                                '&',
                                    [this.attrs.date_start, '<=', this.def_gantt_date_start],
                                    [this.attrs.date_stop, '>=', this.def_gantt_date_end],
                            '&',
                                [this.attrs.date_start, '!=', null],
                                [this.attrs.date_stop, '!=', null],
                ];
            } else if (this.attrs.date_delay !== undefined) {
                // We don't know end date but, we know date delay
                /*
                    Date delay : @TODO Reproduce this filter in good notation
                    (this.attrs.date_start > this.date_start
                    && this.attrs.date_start > this.date_end) ||
                    (this.attrs.date_start < this.date_start &&
                    (this.attrs.date_start + this.attrs.date_delay) > this.date_start)
                */
                filter = [
                ];
            }
            if (domains.length > 0)
                filter = filter.concat(domains);
            else
                filter.push([this.attrs.date_start, '!=', null]);

            return (
                new instance.web.Model(this.dataset.model)
                    .query()
                    .filter(filter)
                    .all()
                    .then(function (result) {
                        self.def_items = result;
                        self.parse_data(domains, contexts, group_bys);
                    })
            );
        },

        reload_gantt: function() {
            var label = 'Name',
                self = this;

            if (this.def_already_loaded === true) {
                gantt.clearAll();
            } else {
                gantt.config.details_on_dblclick = false;
                gantt.config.min_column_width = 45;
                gantt.config.grid_width = 200;
                gantt.config.row_height = 20;

                /* Disallow drag */
                gantt.config.drag_links = false;
                gantt.config.drag_progress = false;
                gantt.config.drag_move = false;
                gantt.config.drag_resize = false;

                /* Give weekend class CSS */
                gantt.templates.scale_cell_class = function (date){
                    if (date.getDay() === 0 || date.getDay() === 6) {
                        return "weekend";
                    }
                };
                gantt.templates.task_cell_class = function (item, date){
                    if (date.getDay() === 0 || date.getDay() === 6) {
                        return "weekend";
                    }
                };
                
                /* Display task details on click */
                if (window.gantt_improvement_event_loaded === undefined) {
                    window.gantt_improvement_event_loaded = true;
                    gantt.attachEvent("onTaskClick", function (id, e) {
                        if (id !== undefined && id.indexOf('p') === -1) {
                            self.on_task_display(id);
                        }
                    });
                }
            }
            if (this.attrs.string !== undefined) {
                label = this.attrs.string;
            }
            gantt.config.columns = [{name: "text", label: label, tree: true}];
            this.def_already_loaded = true;         
        },        

        parse_data: function(domains, contexts, group_bys) {
            var self = this,
                datas = [],
                links = [],
                parents = {},
                i,
                item,
                data,
                start,
                item_parent_id,
                item_parent_name;
            
            this.def_items_ids = [];
            if (group_bys[0] === '' || group_bys[0] === undefined) {
                if (this.attrs.default_group_by !== undefined) {
                    group_bys[0] = this.attrs.default_group_by;
                }
            } 
            for (i in this.def_items) {
                if (this.def_items[i][this.attrs.date_start] !== false &&
                    ((this.attrs.date_stop !== undefined &&
                      this.def_items[i][this.attrs.date_stop] !== undefined &&
                      this.def_items[i][this.attrs.date_stop] !== false) ||
                    (this.attrs.date_delay !== undefined &&
                     this.def_items[i][this.attrs.date_delay] !== undefined &&
                     this.def_items[i][this.attrs.date_delay] !== false))) {
                    
                    item = this.def_items[i];
                    data = null;
                    start = null;
                    item_parent_id = 'p' + i;
                    item_parent_name = 'task' + i;

                    this.def_items_ids[item.id] = item;
                    if (group_bys[0] === '' || group_bys[0] === undefined ||
                        item[group_bys[0]] === undefined ||
                        item[group_bys[0]] === false) {

                        item_parent_id = 'p' + 0;
                        item_parent_name = 'Gantt View';
                    } else if (item[group_bys[0]] !== undefined) {

                        item_parent_id = 'p' + item[group_bys][0];
                        item_parent_name = item[group_bys][1];
                    }

                    if (parents[item_parent_id] === undefined) {
                        parents[item_parent_id] = 1;
                        datas.push({
                            'id': item_parent_id,
                            'text' : item_parent_name,
                            open : true
                        });
                    }

                    start = instance.web.auto_str_to_date(item[this.attrs.date_start]);
                    data = {
                        'id' : item.id,
                        'text': item.name,
                        'start_date' : start,
                        'parent' : item_parent_id,
                    };
                    if (item.sequence !== undefined)
                        data.order = item.sequence;
                    if (this.attrs.progress !== undefined) {
                        data.progress = item[this.attrs.progress] / 100.00;
                    }
                    if (this.attrs.date_stop !== undefined) {
                        var end = instance.web.auto_str_to_date(item[this.attrs.date_stop]);
                        data.end_date = end;
                    } else if (this.attrs.date_delay !== undefined){
                        data.duration = (item[this.attrs.date_delay] > 0) ? item[this.attrs.date_delay] : 0.1;
                    } else {
                        console.error('Error gantt_improvement E1');
                    }
                    datas.push(data);
                }
            }
            this.draw_gantt(datas, links);
        },

        draw_gantt: function (datas, links) {
            var today = new Date();

            gantt.init(this.gantt_improvement_id, this.def_gantt_date_start, this.def_gantt_date_stop);
            gantt.parse({'data': datas, 'links': links});
            gantt.config.start_date = this.def_gantt_date_start;
            gantt.config.end_date = this.def_gantt_date_stop;
            gantt.addMarker({
                start_date: today,
                css: "today",
                text: _lt("Today"),
                title: _lt("Today")
            });
        },

        /* Buttons functions */
        reset_scale: function () {
            this.set_scale($('.gantt_improvement_scale').val());
            gantt.render();
        },

        reload_button: function () {
            var date_start,
                date_stop;

            date_start = document.getElementById('gantt_improvement_date_start').value;
            date_stop = document.getElementById('gantt_improvement_date_stop').value;
            if (date_start !== '' && date_start !== null && date_stop !== '' && date_stop !== null) {
                this.def_gantt_date_start = new Date(date_start);
                this.def_gantt_date_stop = new Date(date_stop);
                gantt.config.start_date = this.def_gantt_date_start;
                gantt.config.end_date = this.def_gantt_date_stop;
            }
            this.reload();
        },

        set_scale: function (value) {
            switch (value) {
                case "1":
                    gantt.config.scale_unit = "day";
                    gantt.config.step = 1;
                    gantt.config.date_scale = "%d %M";
                    gantt.config.subscales = [];
                    gantt.config.scale_height = 27;
                    gantt.templates.date_scale = null;
                    break;
                case "2":
                    var weekScaleTemplate = function(date){
                        var dateToStr = gantt.date.date_to_str("%d %M");
                        var endDate = gantt.date.add(gantt.date.add(date, 1, "week"), -1, "day");
                        return dateToStr(date) + " - " + dateToStr(endDate);
                    };

                    gantt.config.scale_unit = "week";
                    gantt.config.step = 1;
                    gantt.templates.date_scale = weekScaleTemplate;
                    gantt.config.subscales = [
                        {unit:"day", step:1, date:"%D" }
                    ];
                    gantt.config.scale_height = 50;
                    break;
                case "3":
                    gantt.config.scale_unit = "month";
                    gantt.config.date_scale = "%F, %Y";
                    gantt.config.subscales = [
                        {unit:"day", step:1, date:"%j, %D" }
                    ];
                    gantt.config.scale_height = 50;
                    gantt.templates.date_scale = null;
                    break;
                case "4":
                    gantt.config.scale_unit = "year";
                    gantt.config.step = 1;
                    gantt.config.date_scale = "%Y";
                    gantt.config.min_column_width = 50;

                    gantt.config.scale_height = 90;
                    gantt.templates.date_scale = null;

                    
                    gantt.config.subscales = [
                        {unit:"month", step:1, date:"%M" }
                    ];
                    break;
            }
        },

        on_task_display: function(id) {
            var self = this;
            var pop = new instance.web.form.FormOpenPopup(self);
            pop.on('write_completed',self,self.reload);
            pop.show_element(
                self.dataset.model,
                parseInt(id),
                null,
                {}
            );
        },

        on_task_create: function() {
            var self = this;
            var pop = new instance.web.form.SelectCreatePopup(this);
            pop.on("elements_selected", self, function() {
                self.reload();
            });
            pop.select_element(self.dataset.model, {initial_view: "form"});
        },
        
    });
};

