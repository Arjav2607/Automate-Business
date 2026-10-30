"""
app.py — the main Flask application.
Run with:  python app.py   (then open http://127.0.0.1:5000)

Login password: set the OWNER_PASSWORD environment variable,
or use the default 'owner123' (change it for the demo!).
"""
import os
import json
from datetime import datetime, timedelta
from functools import wraps

import requests
from flask import (Flask, request, jsonify, render_template,
                   session, redirect, url_for, Response)

from database import get_db, init_db

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-this-in-production")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,   # no JS access to the session cookie
    SESSION_COOKIE_SAMESITE="Lax",  # not sent on cross-site requests
)
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "owner123")

init_db()  # create tables + sample data on first run

# Owner credentials live in credentials.json once changed (env var is the default)
CRED_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "credentials.json")
ATTEMPTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "login_attempts.json")
MAX_ATTEMPTS = 3
LOCK_DAYS = 3


def load_credentials():
    try:
        with open(CRED_PATH) as f:
            c = json.load(f)
            return {"owner_id": c.get("owner_id", "Arjav Jain"),
                    "password": c.get("password", OWNER_PASSWORD),
                    "recovery_code": c.get("recovery_code", "RECOVER42")}
    except Exception:
        return {"owner_id": "Arjav Jain", "password": OWNER_PASSWORD,
                "recovery_code": "RECOVER42"}


def load_attempts():
    try:
        with open(ATTEMPTS_PATH) as f:
            a = json.load(f)
    except Exception:
        a = {}
    a.setdefault("fails", 0)
    a.setdefault("locked_until", 0)
    a.setdefault("recovery_year", 0)
    a.setdefault("recovery_fails", 0)
    return a


def save_attempts(a):
    with open(ATTEMPTS_PATH, "w") as f:
        json.dump(a, f)


def save_credentials(c):
    with open(CRED_PATH, "w") as f:
        json.dump(c, f)


# ---------- Login protection ----------
# This "decorator" wraps pages so they only open if you're logged in.
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


# ---------- Pages (the HTML screens) ----------
@app.route("/login", methods=["GET", "POST"])
def login():
    attempts = load_attempts()
    now = datetime.now().timestamp()

    if request.method == "POST":
        # locked? refuse even with the right password
        if now < attempts["locked_until"]:
            return jsonify({"ok": False, "locked": True,
                            "retry_in": int(attempts["locked_until"] - now)}), 423
        creds = load_credentials()
        if (request.form.get("owner_id", "").strip() == creds["owner_id"]
                and request.form.get("password") == creds["password"]):
            attempts["fails"] = 0          # success resets the lock counter,
            attempts["locked_until"] = 0   # recovery counters stay untouched
            save_attempts(attempts)
            session["logged_in"] = True
            return jsonify({"ok": True})
        # wrong password: count it, lock on the 3rd failure
        attempts["fails"] += 1
        locked = False
        if attempts["fails"] >= MAX_ATTEMPTS:
            attempts["locked_until"] = (datetime.now() + timedelta(days=LOCK_DAYS)).timestamp()
            attempts["fails"] = 0
            locked = True
        save_attempts(attempts)
        return jsonify({
            "ok": False,
            "error": "Wrong password",
            "attempts_left": max(0, MAX_ATTEMPTS - attempts["fails"]),
            "locked": locked,
            "retry_in": int(attempts["locked_until"] - now) if locked else 0,
        }), 401

    locked = now < attempts["locked_until"]
    return render_template("login.html", error=None,
                           pw_len=len(load_credentials()["password"]),
                           owner_id=load_credentials()["owner_id"],
                           locked=locked,
                           retry_in=max(0, int(attempts["locked_until"] - now)) if locked else 0)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def dashboard():
    rng = request.args.get("range", "week")
    ranges = {
        "day": ("date(created_at) = date('now')", "%H:00"),
        "week": ("created_at >= datetime('now', '-7 days')", "%d %b"),
        "month": ("created_at >= datetime('now', '-30 days')", "%d %b"),
        "year": ("1=1", "%b %Y"),
    }
    where, fmt = ranges.get(rng, ranges["week"])
    db = get_db()
    chart = db.execute(
        f"SELECT strftime('{fmt}', created_at) AS label, SUM(amount) AS total"
        f" FROM orders WHERE {where} GROUP BY label ORDER BY MIN(created_at)"
    ).fetchall()
    today = datetime.now().strftime("%Y-%m-%d")
    o = db.execute(
        "SELECT COUNT(*) c, COALESCE(SUM(amount),0) s FROM orders WHERE date(created_at)=?",
        (today,)).fetchone()
    p = db.execute("SELECT COUNT(*) c FROM approvals WHERE status='pending'").fetchone()
    l = db.execute("SELECT COUNT(*) c FROM products WHERE stock < 5").fetchone()
    return render_template("dashboard.html",
                           chart_labels=[r["label"] for r in chart],
                           chart_values=[r["total"] or 0 for r in chart],
                           range=rng,
                           stats={"orders": o["c"], "revenue": round(o["s"]),
                                  "pending": p["c"], "low": l["c"]},
                           now=datetime.now().strftime("%d %B"))


@app.route("/orders")
@login_required
def orders_page():
    """Recent orders, quick-access flip cards, filterable by range."""
    rng = request.args.get("range", "week")
    filters = {
        "day": "date(created_at) = date('now')",
        "week": "created_at >= datetime('now', '-7 days')",
        "month": "created_at >= datetime('now', '-30 days')",
        "year": "1=1",
    }
    where = filters.get(rng, filters["week"])
    db = get_db()
    products = db.execute("SELECT * FROM products ORDER BY stock ASC").fetchall()
    low_count = db.execute("SELECT COUNT(*) c FROM products WHERE stock < 5").fetchone()["c"]
    orders = db.execute(
        f"SELECT * FROM orders WHERE {where} ORDER BY id DESC LIMIT 100").fetchall()
    # Enrich each order with that customer's full picture (stats + last chat)
    enriched = []
    for o in orders:
        stats = db.execute(
            "SELECT COUNT(*) c, COALESCE(SUM(amount),0) s FROM orders WHERE customer=?",
            (o["customer"],)).fetchone()
        last = db.execute(
            "SELECT message FROM conversations WHERE customer=? ORDER BY id DESC LIMIT 1",
            (o["customer"],)).fetchone()
        enriched.append({"order": o,
                         "total_orders": stats["c"],
                         "total_spent": stats["s"],
                         "last_msg": last["message"] if last else "No chats yet"})
    return render_template("orders.html", products=products, orders=enriched,
                           range=rng, low_count=low_count)


@app.route("/customers")
@login_required
def customers_page():
    """Customer history: one folder per customer with all their orders."""
    db = get_db()
    orders = db.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 200").fetchall()
    by_customer = {}
    for o in orders:
        by_customer.setdefault(o["customer"], []).append(o)
    customers = []
    for name, ords in by_customer.items():
        total = sum(x["amount"] for x in ords)
        customers.append({"name": name, "orders": ords, "total": total})
    ratings = {r["customer"]: r["rating"]
               for r in db.execute("SELECT customer, rating FROM feedback").fetchall()}
    return render_template("customers.html", customers=customers, ratings=ratings)


@app.route("/conversations")
@login_required
def conversations_page():
    db = get_db()
    msgs = db.execute("SELECT * FROM conversations ORDER BY id DESC LIMIT 200").fetchall()
    return render_template("conversations.html", messages=list(reversed(msgs)))


@app.route("/approvals")
@login_required
def approvals_page():
    db = get_db()
    pending = db.execute(
        "SELECT * FROM approvals WHERE status='pending' ORDER BY id DESC").fetchall()
    decided = db.execute(
        "SELECT * FROM approvals WHERE status!='pending' ORDER BY id DESC LIMIT 20").fetchall()
    return render_template("approvals.html", pending=pending, decided=decided)


# ---------- JSON APIs ----------
@app.route("/api/stats")
@login_required
def stats():
    """Numbers for the dashboard cards. Polled every 5s by app.js.
    created_at is stored in UTC (SQLite CURRENT_TIMESTAMP), so compare in UTC."""
    db = get_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    o = db.execute(
        "SELECT COUNT(*) c, COALESCE(SUM(amount),0) s FROM orders WHERE date(created_at)=?",
        (today,)).fetchone()
    p = db.execute("SELECT COUNT(*) c FROM approvals WHERE status='pending'").fetchone()
    l = db.execute("SELECT COUNT(*) c FROM products WHERE stock < 5").fetchone()
    return jsonify({
        "todayOrders": o["c"],
        "todayRevenue": f"Rs {o['s']:,.0f}",
        "pendingApprovals": p["c"],
        "pendingCount": p["c"],   # raw number, used by JS for the beep alert
        "lowStock": l["c"],
    })


@app.route("/api/chart")
@login_required
def chart_data():
    """Revenue for the dashboard chart, by range: day / week / month / year."""
    rng = request.args.get("range", "week")
    db = get_db()
    if rng == "day":
        rows = db.execute(
            "SELECT strftime('%H:00', created_at) AS label, SUM(amount) AS total"
            " FROM orders WHERE date(created_at)=date('now')"
            " GROUP BY label ORDER BY label").fetchall()
    elif rng == "month":
        rows = db.execute(
            "SELECT date(created_at) AS label, SUM(amount) AS total"
            " FROM orders WHERE created_at >= date('now','-30 days')"
            " GROUP BY label ORDER BY label").fetchall()
    elif rng == "year":
        rows = db.execute(
            "SELECT strftime('%Y-%m', created_at) AS label, SUM(amount) AS total"
            " FROM orders GROUP BY label ORDER BY label").fetchall()
    else:  # week
        rows = db.execute(
            "SELECT date(created_at) AS label, SUM(amount) AS total"
            " FROM orders WHERE created_at >= date('now','-7 days')"
            " GROUP BY label ORDER BY label").fetchall()
    return jsonify({
        "labels": [r["label"] for r in rows],
        "values": [r["total"] or 0 for r in rows],
    })


@app.route("/bill/<fmt>")
@login_required
def bill(fmt):
    """Bill export: /bill/html -> printable page, /bill/csv -> download."""
    db = get_db()
    orders = db.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 50").fetchall()
    if fmt == "csv":
        import csv, io
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(["id", "time", "agent", "customer", "product", "qty", "amount", "status"])
        for o in orders:
            w.writerow([o["id"], o["created_at"], o["agent_id"], o["customer"],
                        o["product"], o["quantity"], o["amount"], o["status"]])
        return Response(out.getvalue(), mimetype="text/csv",
                        headers={"Content-Disposition": "attachment; filename=bill.csv"})
    total = sum(o["amount"] for o in orders)
    return render_template("bill.html", orders=orders, total=total,
                           now=datetime.now().strftime("%d %b %Y, %H:%M"))


@app.route("/api/recover", methods=["POST"])
def recover():
    """Locked out? The recovery code unlocks the account, and can also set a
    new password. Wrong recovery codes are limited to 2 per calendar year."""
    data = request.get_json(force=True, silent=True) or {}
    creds = load_credentials()
    att = load_attempts()
    year = datetime.now().year
    if att.get("recovery_year") != year:   # new year = fresh budget
        att["recovery_year"] = year
        att["recovery_fails"] = 0
    if att.get("recovery_fails", 0) >= 3:
        return jsonify({"ok": False, "error": "Recovery is locked",
                        "retry_text": f"until {year + 1} — too many wrong recovery codes this year"}), 423
    if (data.get("recovery_code") or "").strip() != creds["recovery_code"]:
        att["recovery_fails"] = att.get("recovery_fails", 0) + 1
        save_attempts(att)
        left = max(0, 3 - att["recovery_fails"])
        return jsonify({"ok": False, "error": "Wrong recovery code",
                        "attempts_left": left,
                        "locked": left == 0}), 401
    # correct code: unlock everything, optionally set a new password
    new_pw = (data.get("new_password") or "").strip()
    if new_pw:
        if len(new_pw) < 6:
            return jsonify({"ok": False, "error": "New password must be at least 6 characters"}), 400
        creds["password"] = new_pw
        save_credentials(creds)
    att["fails"] = 0
    att["locked_until"] = 0
    att["recovery_fails"] = 0
    save_attempts(att)
    session["logged_in"] = True
    return jsonify({"ok": True})


@app.route("/settings")
@login_required
def settings_page():
    creds = load_credentials()
    return render_template("settings.html", owner_id=creds["owner_id"],
                           recovery_code=creds["recovery_code"])


@app.route("/api/credentials", methods=["POST"])
@login_required
def update_credentials():
    """Owner changes their ID and/or password from Settings."""
    data = request.get_json(force=True, silent=True) or {}
    creds = load_credentials()
    if data.get("current") != creds["password"]:
        return jsonify({"ok": False, "error": "Current password is wrong"}), 400
    owner_id = (data.get("owner_id") or "").strip()
    if owner_id:
        creds["owner_id"] = owner_id
    rec = (data.get("recovery_code") or "").strip()
    if rec:
        creds["recovery_code"] = rec
    new_pw = (data.get("new") or "").strip()
    if new_pw:
        if len(new_pw) < 6:
            return jsonify({"ok": False, "error": "New password must be at least 6 characters"}), 400
        creds["password"] = new_pw
    save_credentials(creds)
    return jsonify({"ok": True, "owner_id": creds["owner_id"]})


@app.route("/api/feedback", methods=["POST"])
@login_required
def save_feedback():
    """Owner rates a customer from the order folder (PeekRating)."""
    data = request.get_json(force=True, silent=True) or {}
    db = get_db()
    db.execute(
        "INSERT INTO feedback (customer, rating, note) VALUES (?,?,?)"
        " ON CONFLICT(customer) DO UPDATE SET"
        " rating=excluded.rating, note=excluded.note, updated_at=CURRENT_TIMESTAMP",
        (data.get("customer"), data.get("rating", 0), data.get("note", "")))
    db.commit()
    return jsonify({"ok": True})


@app.route("/api/orders", methods=["POST"])
@login_required
def create_order():
    """Owner manually adds an order that happened outside the agent's reach."""
    data = request.get_json(force=True, silent=True) or {}
    customer = (data.get("customer") or "").strip()
    product = (data.get("product") or "").strip()
    try:
        qty = int(data.get("quantity") or 1)
    except (TypeError, ValueError):
        qty = 0
    if not customer or not product or qty < 1:
        return jsonify({"ok": False, "error": "Need a customer, a product and quantity ≥ 1"}), 400
    db = get_db()
    p = db.execute("SELECT * FROM products WHERE name=?", (product,)).fetchone()
    if not p:
        return jsonify({"ok": False, "error": "Unknown product"}), 404
    amount = p["price"] * qty
    clean = lambda s: (str(s) if s else "").strip()[:120] or None
    db.execute(
        "INSERT INTO orders (agent_id, customer, product, quantity, amount, status,"
        " phone, email, location, note) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("manual", customer, product, qty, amount, "placed",
         clean(data.get("phone")), clean(data.get("email")),
         clean(data.get("location")), clean(data.get("note"))))
    db.execute("UPDATE products SET stock = MAX(stock - ?, 0) WHERE name=?", (qty, product))
    db.commit()
    return jsonify({"ok": True, "amount": amount})


@app.route("/api/webhook/n8n", methods=["POST"])
def n8n_webhook():
    """
    THE most important route. Your n8n workflows POST events here.
    Test it yourself with curl (see the README in the chat).
    """
    data = request.get_json(force=True, silent=True) or {}
    # optional shared secret: set N8N_TOKEN and send it as X-Webhook-Token
    token = os.environ.get("N8N_TOKEN")
    if token and request.headers.get("X-Webhook-Token") != token:
        return jsonify({"ok": False, "error": "unauthorized"}), 401
    event = data.get("event")
    db = get_db()

    if event == "order_placed":
        db.execute(
            "INSERT INTO orders (agent_id, customer, product, quantity, amount, status)"
            " VALUES (?,?,?,?,?,?)",
            (data.get("agent_id"), data.get("customer"), data.get("product"),
             data.get("quantity", 1), data.get("amount", 0),
             data.get("status", "placed")))
        # auto-decrease stock
        db.execute("UPDATE products SET stock = MAX(stock - ?, 0) WHERE name = ?",
                   (data.get("quantity", 1), data.get("product")))

    elif event == "message":
        db.execute(
            "INSERT INTO conversations (agent_id, customer, sender, message, audio_url, duration)"
            " VALUES (?,?,?,?,?,?)",
            (data.get("agent_id"), data.get("customer"),
             data.get("sender"), data.get("text"),
             data.get("audio_url"), data.get("duration", 0)))

    elif event == "approval_needed":
        # resume_url = the n8n "Wait" node's webhook URL, sent by the workflow
        db.execute(
            "INSERT INTO approvals (agent_id, type, summary, context, resume_url)"
            " VALUES (?,?,?,?,?)",
            (data.get("agent_id"), data.get("type"), data.get("summary"),
             data.get("context"), data.get("resume_url")))

    elif event == "stock_update":
        db.execute("UPDATE products SET stock = ? WHERE name = ?",
                   (data.get("stock"), data.get("product")))

    else:
        return jsonify({"ok": False, "error": f"unknown event: {event}"}), 400

    db.commit()
    return jsonify({"ok": True})


@app.route("/api/conversations/<int:mid>", methods=["DELETE"])
@login_required
def delete_message(mid):
    db = get_db()
    db.execute("DELETE FROM conversations WHERE id=?", (mid,))
    db.commit()
    return jsonify({"ok": True})


@app.route("/api/conversations/<int:mid>/flag", methods=["POST"])
@login_required
def flag_message(mid):
    db = get_db()
    db.execute("UPDATE conversations SET flagged = 1 - COALESCE(flagged,0) WHERE id=?",
               (mid,))
    db.commit()
    return jsonify({"ok": True})


@app.route("/api/approvals/<int:approval_id>/<decision>", methods=["POST"])
@login_required
def decide(approval_id, decision):
    """Owner clicked Approve/Reject -> update DB, then wake up the n8n workflow."""
    if decision not in ("approved", "rejected"):
        return jsonify({"ok": False}), 400
    db = get_db()
    row = db.execute("SELECT * FROM approvals WHERE id=?",
                     (approval_id,)).fetchone()
    if not row:
        return jsonify({"ok": False, "error": "not found"}), 404
    if row["status"] != "pending":
        return jsonify({"ok": False, "error": "already decided"}), 400

    db.execute("UPDATE approvals SET status=?, decided_at=? WHERE id=?",
               (decision, datetime.now(), approval_id))
    db.commit()

    # Resume the paused n8n workflow. If n8n is offline we still keep the decision.
    try:
        requests.post(row["resume_url"],
                      json={"decision": decision, "approval_id": approval_id},
                      timeout=10)
    except requests.RequestException as e:
        return jsonify({"ok": True, "warning": f"n8n unreachable: {e}"})
    return jsonify({"ok": True})


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


if __name__ == "__main__":
    # FLASK_DEBUG=1 enables auto-reload; off by default
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", port=5000)
