{
    'name': "Gantt Improvement",
    'author': 'Stéphane Codazzi @ TeMPO-Consulting',
    'category': 'Project',
    'sequence': 1,
    'description': """
Gantt Improvement
=================
    """,
    'version': '0.3',
    'depends': ['web', 'web_gantt'],
    'js': [
        'static/src/js/gantt.js',
        'static/dhtmlxGantt/sources/dhtmlxgantt.js',
    ],
    'css': [
        'static/src/css/gantt.css',
        'static/dhtmlxGantt/dhtmlxgantt.css',
    ],
    'qweb': ['static/src/xml/gantt.xml'],
}
