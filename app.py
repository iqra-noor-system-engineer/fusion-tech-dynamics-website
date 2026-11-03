from hashlib import sha256
from pathlib import Path

from flask import Flask, redirect, render_template

app = Flask(__name__)


@app.context_processor
def inject_asset_version():
    """Cache-bust CSS and JavaScript whenever their contents change."""
    digest = sha256()
    for asset in ("static/css/styles.css", "static/js/script.js"):
        digest.update((Path(__file__).parent / asset).read_bytes())
    return {"asset_version": digest.hexdigest()[:12]}


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/services")
def services():
    return render_template("services.html")

@app.route("/solutions")
def solutions():
    return redirect("/products", code=301)

@app.route("/products")
def products():
    return render_template("products.html")

@app.route("/products/orvex")
def product_orvex():
    return render_template("product_orvex.html")

@app.route("/products/recura")
def product_recura():
    return render_template("product_recura.html")

@app.route("/products/cubbo")
def product_cubbo():
    return render_template("product_cubbo.html")

@app.route("/capabilities")
def capabilities():
    return render_template("capabilities.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/careers')
def careers():
    return render_template('careers.html')

@app.route('/training')
def training():
    return render_template('training.html')

if __name__ == "__main__":
    app.run(debug=True)

