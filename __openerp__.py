{
    'name': "TeMPO - Gantt Improvement",
    'author': 'Stéphane Codazzi @ TeMPO-Consulting',
    'category': 'Project',
    'website': 'https://github.com/stephane-/odoo_addons/issues',
    'sequence': 1,
    'description': """
=========================
TeMPO - Gantt Improvement
=========================

"TeMPO - Gantt Improvement" replace the default gantt and add features :
 - Update to latest DHTMLX gantt version
 - Add diffenrents scales (Day, Week, Month, Year)
 - Better integration

 License: MIT
 Support: https://github.com/stephane-/odoo_addons/issues

    """,
    'version': '1.2',
    'depends': ['web', 'web_gantt'],
    'js': [
        'static/src/js/gantt.js',
        'static/dhtmlxGantt/sources/dhtmlxgantt.js',
        'static/dhtmlxGantt/ext/dhtmlxgantt_marker.js',
    ],
    'css': [
        'static/src/css/gantt.css',
        'static/dhtmlxGantt/dhtmlxgantt.css',
    ],
    'qweb': ['static/src/xml/gantt.xml'],
    'data': [
        'views/web_gantt.xml',  # Odoo V8.0, comment this for Odoo V7
    ],
}
