"""from openerp.osv import fields, osv

class gantt_improvement(osv.osv):
    _inherit = 'res.users'

    def _get_day_offset(self, cr, uid, ids, field_name, arg, context=None):
        if isinstance(ids, (int, long)):
            ids = [ids]
        res = {}
        for so in self.browse(cr, uid, ids, context=context):
            res[so.id] = 555
        return res

    _columns = {
        'gantt_improvement_day_offset': fields.integer('Gant Offset'),
        'gantt_improvement_links_projects': fields.boolean('Links between projects and tasks'),
        'gantt_improvement_links_contraint': fields.boolean('Links between two tasks (Long term projects)'),
    }
    _defaults = {
        'gantt_improvement_links_projects': True,
        'gantt_improvement_links_contraint': True,
    }
"""
