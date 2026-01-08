-- Insert Demo User with Admin Role and All Permissions

INSERT INTO users (
    username,
    full_name,
    password,
    role,
    is_active,
    role_mode,
    permissions
) VALUES (
    'demo',
    'Demo User',
    '1234', 
    'admin',
    TRUE,
    'default',
    '{
        "dashboard": {"create": true, "read": true, "update": true, "delete": true},
        "projects": {"create": true, "read": true, "update": true, "delete": true},
        "quotations": {"create": true, "read": true, "update": true, "delete": true},
        "expenses": {"create": true, "read": true, "update": true, "delete": true},
        "payments": {"create": true, "read": true, "update": true, "delete": true},
        "suppliers": {"create": true, "read": true, "update": true, "delete": true},
        "teams": {"create": true, "read": true, "update": true, "delete": true},
        "materials": {"create": true, "read": true, "update": true, "delete": true},
        "products": {"create": true, "read": true, "update": true, "delete": true},
        "reports": {"create": true, "read": true, "update": true, "delete": true},
        "leads": {"create": true, "read": true, "update": true, "delete": true},
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "settings": {"create": true, "read": true, "update": true, "delete": true},
        "trash": {"create": true, "read": true, "update": true, "delete": true},
        "todo": {"create": true, "read": true, "update": true, "delete": true},
        "todo_team": {"create": true, "read": true, "update": true, "delete": true},
        "marketing": {"create": true, "read": true, "update": true, "delete": true},
        "summary": {"create": true, "read": true, "update": true, "delete": true}
    }'
);
