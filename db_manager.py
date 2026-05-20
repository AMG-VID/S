import sqlite3, os, hashlib, json
from datetime import datetime

def get_config_path():
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")

def get_db_path():
    cfg = get_config_path()
    if os.path.exists(cfg):
        with open(cfg, 'r', encoding='utf-8') as f:
            config = json.load(f)
        d = config.get("data_path", os.path.join(os.path.expanduser("~"), "POSData"))
    else:
        d = os.path.join(os.path.expanduser("~"), "POSData")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, "data.db")

def get_connection():
    p = get_db_path()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    conn = sqlite3.connect(p)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(pw):
    salt = b'pos2024salt'
    return hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, 100000).hex()

def verify_password(pw, hashed):
    return hash_password(pw) == hashed

def get_setting(key, default=None):
    try:
        conn = get_connection()
        row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        conn.close()
        return row[0] if row else default
    except:
        return default

def set_setting(key, value):
    conn = get_connection()
    conn.execute("INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)", (key, str(value)))
    conn.commit()
    conn.close()

def log_action(user_id, action_type, details, affected_table=None, affected_id=None):
    try:
        conn = get_connection()
        conn.execute("INSERT INTO audit_log (user_id,action_type,details,affected_table,affected_id) VALUES (?,?,?,?,?)",
                     (user_id, action_type, details, affected_table, affected_id))
        conn.commit()
        conn.close()
    except: pass

def get_next_invoice_number():
    conn = get_connection()
    today = datetime.now().strftime('%Y%m%d')
    prefix = f"INV-{today}-"
    row = conn.execute("SELECT invoice_number FROM sales_header WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1", (prefix+'%',)).fetchone()
    conn.close()
    if row:
        return f"{prefix}{int(row[0].split('-')[-1])+1:04d}"
    return f"{prefix}0001"

def init_database():
    conn = get_connection()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Cashier',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            barcode TEXT UNIQUE,
            price_retail REAL DEFAULT 0,
            price_wholesale REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            quantity REAL DEFAULT 0,
            unit TEXT DEFAULT 'قطعة',
            low_stock_threshold REAL DEFAULT 5,
            supplier_id INTEGER,
            image_path TEXT,
            is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            debt REAL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sales_header (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL,
            date TEXT NOT NULL,
            customer_id INTEGER,
            subtotal REAL DEFAULT 0,
            discount_type TEXT DEFAULT 'none',
            discount_value REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            tax_rate REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            grand_total REAL DEFAULT 0,
            paid REAL DEFAULT 0,
            payment_method TEXT DEFAULT 'كاش',
            status TEXT DEFAULT 'ناجحة',
            cashier_id INTEGER
        );
        CREATE TABLE IF NOT EXISTS sales_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            product_name TEXT,
            quantity REAL,
            unit_price REAL,
            cost_price REAL DEFAULT 0,
            total REAL
        );
        CREATE TABLE IF NOT EXISTS missing_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            quantity_needed REAL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            action_type TEXT,
            details TEXT,
            affected_table TEXT,
            affected_id INTEGER
        );
        CREATE TABLE IF NOT EXISTS supplier_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            product_id INTEGER,
            UNIQUE(supplier_id, product_id)
        );
    ''')
    conn.commit()

    # Insert defaults if empty
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        conn.execute("INSERT INTO users (username,password_hash,role) VALUES (?,?,'Owner')",
                     ('admin', hash_password('admin123')))
        defaults = [
            ('store_name','متجري'),('tax_enabled','0'),('tax_rate','14'),
            ('print_copies','1'),('paper_size','80mm'),('preview_before_print','1'),
            ('printer_name',''),('currency','ج.م'),('icon_path',''),
            ('auto_login_user',''),('discount_enabled','1'),
        ]
        for k,v in defaults:
            conn.execute("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)",(k,v))

        conn.execute("INSERT INTO suppliers (name,phone) VALUES ('مورد افتراضي','01000000000')")
        sid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute("INSERT INTO products (name,barcode,price_retail,price_wholesale,cost_price,quantity,unit,low_stock_threshold,supplier_id) VALUES ('منتج تجريبي 1','123456',10,8,6,50,'قطعة',5,?)",(sid,))
        p1 = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute("INSERT INTO products (name,barcode,price_retail,price_wholesale,cost_price,quantity,unit,low_stock_threshold,supplier_id) VALUES ('منتج تجريبي 2','654321',25,20,15,3,'كيلو',5,?)",(sid,))
        p2 = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute("INSERT OR IGNORE INTO supplier_products (supplier_id,product_id) VALUES (?,?)",(sid,p1))
        conn.execute("INSERT OR IGNORE INTO supplier_products (supplier_id,product_id) VALUES (?,?)",(sid,p2))
        conn.execute("INSERT INTO customers (name,phone,debt) VALUES ('عميل نقدي','0000000000',0)")
        cid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute("INSERT INTO customers (name,phone,debt) VALUES ('أحمد محمد','01012345678',50)")

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        today = datetime.now().strftime('%Y%m%d')
        conn.execute("INSERT INTO sales_header (invoice_number,date,customer_id,subtotal,grand_total,paid,payment_method,status,cashier_id) VALUES (?,?,?,35,35,35,'كاش','ناجحة',1)",
                     (f"INV-{today}-0001", now, cid))
        sid2 = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute("INSERT INTO sales_details (sale_id,product_id,product_name,quantity,unit_price,cost_price,total) VALUES (?,?,?,1,10,6,10)",(sid2,p1,'منتج تجريبي 1'))
        conn.execute("INSERT INTO sales_details (sale_id,product_id,product_name,quantity,unit_price,cost_price,total) VALUES (?,?,?,1,25,15,25)",(sid2,p2,'منتج تجريبي 2'))
        conn.commit()
    conn.close()
