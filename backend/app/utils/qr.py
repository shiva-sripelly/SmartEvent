import qrcode
import uuid
import os

def generate_qr_code():
    ticket_code = str(uuid.uuid4())

    folder = "qr_codes"
    if not os.path.exists(folder):
        os.makedirs(folder)

    file_path = f"{folder}/{ticket_code}.png"

    img = qrcode.make(ticket_code)
    img.save(file_path)

    return ticket_code, file_path