/*---------------------------------------------------------
 * OpenERP gantt_improvement
 *---------------------------------------------------------*/
openerp.gantt_improvement = function (instance) {
    var _t = instance.web._t,
        _lt = instance.web._lt,
        QWeb = instance.web.qweb,
        view_level = 1,//1 : year, 2 : month, 3 : week, 4 : daily
        date_start = null, // Date start
        date_end = null, // Date start
        date_midl = null, // Date reference
        date_length = 0, // Put X view_level (3 month)
        attrs = null,
        last_r = null,
        items = null, // List of tasks
        items_id = null,
        gantt_already_loaded = false; // boolean for reloads

    instance.web.views.add('gantt', 'instance.gantt_improvement.GanttView');

    instance.gantt_improvement.GanttView = instance.web.View.extend({
        display_name: _lt('Gantt'),
        template: "GanttView",
        view_type: "gantt",
        events: {
            'click .oe_gantt_buttons_days .zoom_out': 'zoom_out',
            'click .oe_gantt_buttons_days .zoom_in': 'zoom_in',
            'click .oe_gantt_buttons_days .previous': 'previous',
            'click .oe_gantt_buttons_days .next': 'next',
            'click .oe_gantt_buttons_days .load_date': 'load_date',
            'click .oe_gantt_button_create' : 'on_task_create',
        },

        init: function() {
            var self = this;
            this._super.apply(this, arguments);
            this.chart_id = _.uniqueId();
            self.view_level = 2;
            self.gantt_already_loaded = false;
            self.date_length = 0;
            self.date_midl = new Date();
            self.gantt_config();
        },
        reload_gantt: function() {
            var label = "Name";
            var self = this;

            if (self.gantt_already_loaded === true) {
                gantt.clearAll();
            }
            if (self.attrs.string !== undefined)
                label = self.attrs.string;
            gantt.config.columns = [{name:"text", label:label, tree:true}];

            //self.date_length = Math.round(($("#gantt_improvement_length").val() - 1) / 2);
            self.date_length = $("#gantt_improvement_length").val() - 1;
            self.get_select_dates();
            $("#gantt_improvement_date").val(self.date_to_str(self.date_midl));

            self.gantt_already_loaded = true;
            gantt.config.start_date = self.date_start;
            gantt.config.end_date = self.date_end;           
        },
        gantt_config: function() {
            var self = this;
            
            gantt.config.duration_unit = "hour";
            gantt.config.details_on_dblclick = false;
            gantt.config.min_column_width = 45;
            gantt.config.grid_width = 200;
            gantt.config.row_height = 20;
            gantt.config.scale_height = 20*3;
            gantt.config.drag_links = false;
            gantt.config.drag_progress = false;
            gantt.config.subscales = [
                {unit:"year", step:1, date:"%Y"},
            ];
            gantt.templates.scale_cell_class = function (date){
                if(date.getDay() === 0||date.getDay() === 6)
                    return "weekend";
            };
            gantt.templates.task_cell_class = function (item,date){
                if(date.getDay()===0||date.getDay()===6)
                    return "weekend";
            };
            if (window.gantt_improvement_event_loaded === undefined) {
                window.gantt_improvement_event_loaded = true;
                gantt.attachEvent("onTaskClick", function (id, e) {
                    //indexOf(p) for ignore parent's click
                    if (id !== undefined && id.indexOf('p') === -1)
                    self.on_task_display(id);
                });
                gantt.attachEvent("onTaskDrag", function (id, mode, task, original) {
                    self.last_move_task = task;
                });
                gantt.attachEvent("onAfterTaskDrag", function (id, mode, e){
                    self.on_task_changed(self.last_move_task, self.items_id[id]);
                });
            }
        },
        view_loading: function(r) {
            var self = this;
            self.last_r = r;
            this.attrs = r.arch.attrs;
        },
        get_select_dates: function() {
            var d1 = null;
            var d2 = null;
            var date_midl = this.date_midl;
            var length = this.date_length;

            if (this.view_level === 1) {
                gantt.config.date_scale = "%M";
                gantt.config.scale_unit = "month";
                d1 = new Date(date_midl.getFullYear(), 0, 1);
                d2 = new Date(date_midl.getFullYear() + length + 1, 0, 1);
                $('#gantt_improvement_unit').html($('#gantt_improvement_unit_year').attr('placeholder'));
            } else if (this.view_level === 2) {
                gantt.config.date_scale = "%d/%m";
                gantt.config.scale_unit = "day";
                d1 = new Date(date_midl.getFullYear(), date_midl.getMonth(), 1);
                d2 = new Date(date_midl.getFullYear(), date_midl.getMonth() + length + 1, 1);
                $('#gantt_improvement_unit').html($('#gantt_improvement_unit_month').attr('placeholder'));
            } else if (this.view_level === 3) {
                gantt.config.date_scale = "%d/%m";
                gantt.config.scale_unit = "day";
                d1 = new Date(date_midl.getFullYear(), date_midl.getMonth(), date_midl.getDate());
                d2 = new Date(date_midl.getFullYear(), date_midl.getMonth(), date_midl.getDate() + (length * 7) + 7);
                $('#gantt_improvement_unit').html($('#gantt_improvement_unit_week').attr('placeholder'));
            } else {
                gantt.config.date_scale = "%H:00";
                gantt.config.scale_unit = "hour";
                d1 = new Date(date_midl.getFullYear(), date_midl.getMonth(), date_midl.getDate());
                d2 = new Date(date_midl.getFullYear(), date_midl.getMonth(), date_midl.getDate() + length + 1);
                $('#gantt_improvement_unit').html($('#gantt_improvement_unit_day').attr('placeholder'));
            }
            this.date_start = d1;
            this.date_end   = d2;
        },
        do_search: function (domains, contexts, group_bys) {
            var self = this;
            var filter = [];

            self.last_domains = domains;
            self.last_contexts = contexts;
            self.last_group_bys = group_bys;
            self.reload_gantt();
            self.has_been_loaded = $.Deferred();
            
            if (self.attrs.date_stop !== undefined) {
                filter = [
                    '&',
                        '&',
                            '|',
                                '|',
                                    '&',
                                        [self.attrs.date_start, '>=', self.date_start],
                                        [self.attrs.date_start, '<=', self.date_end],
                                    '&',
                                        [self.attrs.date_stop, '>=', self.date_start],
                                        [self.attrs.date_stop, '<=', self.date_end],
                                '&',
                                    [self.attrs.date_start, '<=', self.date_start],
                                    [self.attrs.date_stop, '>=', self.date_start],
                            '&',
                                [self.attrs.date_start, '!=', null],
                                [self.attrs.date_stop, '!=', null],
                ];
            } else if (self.attrs.date_delay !== undefined) {
                /* Date delay :
                    (self.attrs.date_start > self.date_start
                    && self.attrs.date_start > self.date_end) ||
                    (self.attrs.date_start <self.date_start &&
                    (self.attrs.date_start + self.attrs.date_delay) > self.date_start)
                */
                filter = [
                ];
            }
            if (domains.length > 0)
                filter = filter.concat(domains);
            else
                filter.push([self.attrs.date_start, '!=', null]);

            return (
                new instance.web.Model(this.dataset.model)
                    .query()
                    .filter(filter)
                    .all()
                    .then(function (result) {
                        self.items = result;
                        self.draw_gantt(domains, contexts, group_bys);
                        self.has_been_loaded.resolve();
                    })
            );
        },
        draw_gantt: function(domains, contexts, group_bys) {
            var self = this;
            var datas = [];
            var links = [];
            var parents = {};
            

            self.items_id = [];
            if (group_bys[0] === '' || group_bys[0] === undefined) {
                if (self.attrs.default_group_by !== undefined) {
                    group_bys[0] = self.attrs.default_group_by;
                }
            } 
            for(var i in self.items) {
                if (self.items[i][self.attrs.date_start] !== false &&
                    ((self.attrs.date_stop !== undefined && self.items[i][self.attrs.date_stop] !== undefined && self.items[i][self.attrs.date_stop] !== false) ||
                        (self.attrs.date_delay !== undefined && self.items[i][self.attrs.date_delay] !== undefined && self.items[i][self.attrs.date_delay] !== false))) {
                    var item = self.items[i];
                    var data = null;
                    var start = null;
                    var item_parent_id = 'p' + i;
                    var item_parent_name = 'task'+i;

                    self.items_id[item.id] = item;
                    if (group_bys[0] === '' || group_bys[0] === undefined || item[group_bys[0]] === undefined || item[group_bys[0]] === false) {
                        item_parent_id = 'p' + 0;
                        item_parent_name = 'Gantt View';
                    } else if (item[group_bys[0]] !== undefined) {
                        item_parent_id = 'p' + item[group_bys][0];
                        item_parent_name = item[group_bys][1];
                    }

                    if (parents[item_parent_id] === undefined) {
                        parents[item_parent_id] = 1;
                        datas.push({'id': item_parent_id, 'text' : item_parent_name, open : true});
                    }

                    start = instance.web.auto_str_to_date(item[self.attrs.date_start]);
                    data = {
                        'id' : item.id,
                        'text': item.name,
                        //'start_date' : start.getDate()+'-'+(start.getMonth() + 1)+"-"+start.getFullYear(),
                        'start_date' : start,
                        'parent' : item_parent_id,
                    };
                    if (item.sequence !== undefined)
                        data.order = item.sequence;
                    if (self.attrs.progress !== undefined) {
                        data.progress = item[self.attrs.progress] / 100.00;
                    }
                    if (self.attrs.date_stop !== undefined) {
                        var end = instance.web.auto_str_to_date(item[self.attrs.date_stop]);
                        //data.end_date = end.getDate()+'-'+(end.getMonth() + 1)+"-"+end.getFullYear();
                        data.end_date = end;
                    } else if (self.attrs.date_delay !== undefined){
                        data.duration = (item[self.attrs.date_delay] > 0) ? item[self.attrs.date_delay] : 0.1;
                    } else {
                        console.error('Error L126');
                    }
                    datas.push(data);
                }
            }
            gantt.init(self.chart_id);
            gantt.parse({'data' : datas, 'links' : links});
            gantt.showDate(self.date_midl);
        },
        reload: function() {
            this.view_loading(this.last_r);
            return this.do_search(this.last_domains, this.last_contexts, this.last_group_bys);
        },
        zoom_in: function() {
            this.view_level += 1;
            if (this.view_level > 4)
                this.view_level = 4;
            else
                this.reload();
        },
        zoom_out : function() {
            this.view_level -= 1;
            if (this.view_level < 1)
                this.view_level = 1;
            else
                this.reload();
        },
        date_to_str: function(date) {
            var date_str = "";
            var y = date.getFullYear();
            var m = ((date.getMonth() >= 9) ? "" : "0") + (date.getMonth() + 1);
            var d = ((date.getDate() > 9) ? "" : "0") + date.getDate();
            return y+'-'+m+'-'+d;
        },
        previous: function() {
            if (this.view_level === 1)
                this.date_midl = new Date(this.date_midl.getFullYear()-1, this.date_midl.getMonth(), this.date_midl.getDate());
            else if (this.view_level === 2)
                this.date_midl = new Date(this.date_midl.getFullYear(), this.date_midl.getMonth()-1, this.date_midl.getDate());
            else if (this.view_level === 3)
                this.date_midl = new Date(this.date_midl.getFullYear(), this.date_midl.getMonth(), this.date_midl.getDate() -7);
            else
                this.date_midl = new Date(this.date_midl.getFullYear(), this.date_midl.getMonth(), this.date_midl.getDate() -1);
            this.reload();
        },
        next : function() {
            if (this.view_level === 1)
                this.date_midl = new Date(this.date_midl.getFullYear()+1, this.date_midl.getMonth(), this.date_midl.getDate());
            else if (this.view_level === 2)
                this.date_midl = new Date(this.date_midl.getFullYear(), this.date_midl.getMonth()+1, this.date_midl.getDate());
            else if (this.view_level === 3)
                this.date_midl = new Date(this.date_midl.getFullYear(), this.date_midl.getMonth(), this.date_midl.getDate() +7);
            else
                this.date_midl = new Date(this.date_midl.getFullYear(), this.date_midl.getMonth(), this.date_midl.getDate() +1);
            this.reload();
        },
        load_date: function() {
            if ($("#gantt_improvement_date").val().length > 0) {
                this.date_midl = instance.web.auto_str_to_date($("#gantt_improvement_date").val());
                this.reload();
            }
        },
        on_task_create: function() {
            var self = this;
            var pop = new instance.web.form.SelectCreatePopup(this);
            pop.on("elements_selected", self, function() {
                self.reload();
            });
            pop.select_element(self.dataset.model, {initial_view: "form"});
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
        on_task_changed: function (gantt_task, task) {
            var self = this;
            var start = gantt_task.start_date;
            var duration = gantt_task.duration;
            var end = gantt_task.end_date;
            var data = {};

            data[self.attrs.date_start] = start;
            if (self.attrs.date_stop) {
                data[self.attrs.date_stop] = end;
            } else { // we assume date_duration is defined
                data[self.attrs.date_delay] = duration;
            }
            this.dataset.write(task.id, data);
        },
    });
};

