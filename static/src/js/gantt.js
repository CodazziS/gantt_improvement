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

        def_lastTaskEvent: null,                    // Use for task drag/resize
        event_list: [],                             // For remove all event on reload

        /* Odoo vars */
        display_name: _lt('Gantt'),
        template: "GanttView",
        view_type: "gantt",
        
        /* Events */
        events: {
            'click .gantt_improvement_scale' : 'reset_scale',
            'click #gantt_i_search_btn' : 'reload_button'
        },

        /* Functions */
        init: function () {
            this._super.apply(this, arguments);
            this.gantt_improvement_id = _.uniqueId();

            /* init dates with defaults values */
        },

        view_loading: function(r) {
            var self = this;

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
                gantt.config.grid_width = 200;
                gantt.config.row_height = 20;

                /* Disallow drag */
                gantt.config.drag_links = false;
                gantt.config.drag_progress = false;
    
                gantt.config.show_drag_dates = true;
                gantt.config.drag_label_width = 110;
                gantt.config.drag_date = "%Y‐%m‐%d %H:%i";


                /* Highlight area (for drag & resize) */
                gantt.attachEvent("onGanttReady", function () {
                    gantt.templates.drag_date = gantt.date.date_to_str(gantt.config.drag_date);
                    //show drag dates
                    gantt.addTaskLayer({
                        renderer: function show_dates(task) {
                            var sizes = gantt.getTaskPosition(task, task.start_date, task.end_date),
                                wrapper = document.createElement('div');

                            addElement({
                                css: "drag_move_start drag_date",
                                left: sizes.left - gantt.config.drag_label_width + 'px',
                                top: sizes.top + 'px',
                                width: gantt.config.drag_label_width + 'px',
                                height: gantt.config.row_height - 1 + 'px',
                                html: gantt.templates.drag_date(task.start_date),
                                wrapper: wrapper
                            });

                            addElement({
                                css: "drag_move_end drag_date",
                                left: sizes.left + sizes.width + 'px',
                                top: sizes.top + 'px',
                                width: gantt.config.drag_label_width + 'px',
                                height: gantt.config.row_height - 1 + 'px',
                                html: gantt.templates.drag_date(task.end_date),
                                wrapper: wrapper
                            });

                            return wrapper;
                        },
                        filter: function (task) {
                            return gantt.config.show_drag_dates && task.id == gantt.getState().drag_id;
                        }
                    });

                    function addElement(config) {
                        var div = document.createElement('div');
                        div.style.position = "absolute";
                        div.className = config.css || "";
                        div.style.left = config.left;
                        div.style.width = config.width;
                        div.style.height = config.height;
                        div.style.lineHeight = config.height;
                        div.style.top = config.top;
                        if (config.html)
                            div.innerHTML = config.html;
                        if (config.wrapper)
                            config.wrapper.appendChild(div);
                        return div;
                    }
                });

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
                for (var ev in this.event_list) {
                    gantt.detachEvent(this.event_list[ev]); 
                }
                this.event_list.push(gantt.attachEvent("onTaskDblClick", function(id, e) {
                    if (id !== undefined && id !== null && id.indexOf('p') === -1) {
                        self.on_task_display(id);
                    }
                }));
                this.event_list.push(gantt.attachEvent("onTaskDrag", function(id, mode, task, original) {
                    var lastTaskEvent = {};

                    lastTaskEvent.date_start = task.start_date;
                    lastTaskEvent.date_end = task.end_date;
                    lastTaskEvent.odoo_id = task.id;
                    lastTaskEvent.duration = task.duration;
                    self.def_lastTaskEvent = lastTaskEvent;
                }));

                this.event_list.push(gantt.attachEvent("onAfterTaskDrag", function(id, mode, task, original) {
                    var date_start,
                        date_end;

                    if (self.def_lastTaskEvent !== undefined && self.def_lastTaskEvent !== null) {
                        /* Set seconds to 0 */
                        date_start = new Date.parse(self.def_lastTaskEvent.date_start);
                        date_start.setSeconds(0);
                        self.def_lastTaskEvent.date_start = date_start;

                        date_end = new Date.parse(self.def_lastTaskEvent.date_end);
                        date_end.setSeconds(0);
                        self.def_lastTaskEvent.date_end = date_end;

                        self.saveLastTask(self.def_lastTaskEvent);
                        self.def_lastTaskEvent = null;
                    }
                }));

                /* Add create button */
                this.$buttons = $(QWeb.render("GanttView.buttons", {'widget':self}));
                if (this.options.$buttons) {
                    this.$buttons.appendTo(this.options.$buttons);
                }
                document.getElementById('gantt_i_create_button').addEventListener("click", function() {
                    self.create_button(self);
                });
                this.$sidebar = this.options.$sidebar || this.$el.find('.oe_form_sidebar');
                if (!this.sidebar && this.options.$sidebar) {
                    this.sidebar = new instance.web.Sidebar(this);
                    this.sidebar.appendTo(this.$sidebar);
                }
            }
            if (this.attrs.string !== undefined) {
                label = this.attrs.string;
            }
            gantt.config.columns = [
                {name: "text", label: label, width:"*", tree:true}
            ];
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
                        var date_stop = instance.web.auto_str_to_date(item[this.attrs.date_stop]);
                        data.end_date = date_stop;
                    } else if (item[this.attrs.date_start + "_end"] !== undefined) {
                        /*
                            Fix for MRP module:
                            no date_stop in attrs, but date_planned_end found on itmes
                        */
                        var date_start_end = instance.web.auto_str_to_date(item[this.attrs.date_start + "_end"]);
                        data.end_date = date_start_end;
                    } else if (this.attrs.date_delay !== undefined) {
                        var unitvalues = ["minute", "hour", "day", "week", "month", "year"];
                        if (unitvalues.indexOf(this.attrs.date_delay) > -1) {
                            gantt.config.duration_unit = this.attrs.date_delay;
                        }
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

        create_button: function(self) {
            var pop = new instance.web.form.SelectCreatePopup(self);

            pop.on("elements_selected", self, function() {
                self.reload();
            });
            pop.select_element(self.dataset.model, {initial_view: "form"});
        },

        do_hide: function () {
            if (this.sidebar) {
                this.sidebar.$el.hide();
            }
            if (this.$buttons) {
                this.$buttons.hide();
            }
            if (this.$pager) {
                this.$pager.hide();
            }
            this._super();
        },

        do_show: function (options) {

            if (this.sidebar) {
                this.sidebar.$el.show();
            }
            if (this.$buttons) {
                this.$buttons.show();
            }
            if (this.$pager) {
                this.$pager.show();
            }
            this._super();
        },

        saveLastTask: function(lastTaskEvent) {
            var data = {};

            data[this.attrs.date_start] = lastTaskEvent.date_start;
            gantt.getTask(lastTaskEvent.odoo_id).start_date = lastTaskEvent.date_start;
            if (this.attrs.date_stop) {
                data[this.attrs.date_stop] = lastTaskEvent.date_end;
                gantt.getTask(lastTaskEvent.odoo_id).end_date = lastTaskEvent.date_end;
            } else { // we assume date_duration is defined
                data[this.attrs.date_delay] = lastTaskEvent.duration;
                gantt.getTask(lastTaskEvent.odoo_id).duration = lastTaskEvent.duration;
            }
            this.dataset.write(lastTaskEvent.odoo_id, data);

            gantt.updateTask(lastTaskEvent.odoo_id);
        }
    });
};

