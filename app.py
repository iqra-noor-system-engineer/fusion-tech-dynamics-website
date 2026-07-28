import os

from flask import Flask, render_template, request, redirect, flash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

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
    return render_template("solutions.html")

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

@app.route('/send', methods=['POST'])
def send():
    name = request.form['name']
    email = request.form['email']
    message = request.form['message']

    # Handle however you like — store in DB, send email, etc.
    print(f"Contact message from {name} ({email}): {message}")

    flash('Thanks for reaching out! We\'ll get back to you shortly.')
    return redirect('/contact')

@app.route('/apply-internship', methods=['POST'])
def apply_internship():
    name = request.form['name']
    email = request.form['email']
    university = request.form['university']
    field = request.form['field']
    message = request.form['message']

    # You can handle this however you like — store in DB, send email, etc.
    print(f"Internship Application from {name} ({email})")

    flash('Thank you for applying! We’ll get back to you soon.')
    return redirect('/careers')

if __name__ == "__main__":
    app.run(debug=True)

