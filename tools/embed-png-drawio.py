import base64
import pathlib

png = pathlib.Path(r"d:\TT\movie-booking\docs\architecture-mau-chuan-real.png")
b64 = base64.b64encode(png.read_bytes()).decode()
w, h = 2400, 1200
xml = f"""<mxfile host="app.diagrams.net" agent="Cursor" version="24.7.17" type="device">
  <diagram id="mentor-png" name="Movie Ticket Booking">
    <mxGraphModel dx="2400" dy="1200" grid="0" page="1" pageScale="1" pageWidth="{w}" pageHeight="{h}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="bg" value="" style="shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=data:image/png;base64,{b64}" vertex="1" parent="1">
          <mxGeometry x="0" y="0" width="{w}" height="{h}" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""
out = pathlib.Path(r"d:\TT\movie-booking\docs\movie-booking-MENTOR.drawio")
out.write_text(xml, encoding="utf-8", newline="\n")
print(f"OK {out} ({out.stat().st_size // 1024} KB)")
