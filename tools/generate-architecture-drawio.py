"""Generate draw.io matching mentor reference layout."""
from xml.sax.saxutils import escape

PAGE_W, PAGE_H = 2400, 1200
next_id = 2
cells = []


def nid():
    global next_id
    n = next_id
    next_id += 1
    return str(n)


def icon(res: str, fill: str, sz: int = 10) -> str:
    pts = (
        "[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],"
        "[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],"
        "[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]]"
    )
    return (
        f"sketch=0;points={pts};outlineConnect=0;fontColor=#232F3E;"
        f"fillColor={fill};strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;"
        f"verticalAlign=top;align=center;html=1;fontSize={sz};fontStyle=0;"
        f"aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.{res};"
    )


def vtx(vid, label, style, x, y, w, h, parent="1"):
    cells.append(
        f'        <mxCell id="{vid}" value="{escape(label)}" style="{style}" '
        f'vertex="1" parent="{parent}">\n'
        f'          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />\n'
        f"        </mxCell>"
    )


def edge(src, tgt, label="", dashed=False, bidir=False, color="#545B64",
         exit_xy=None, entry_xy=None, points=None, parent="region"):
    eid = nid()
    sa = "startArrow=classic;" if bidir else ""
    dash = "dashed=1;" if dashed else ""
    style = (
        "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;"
        f"html=1;endArrow=classic;{sa}{dash}strokeWidth=1.5;strokeColor={color};"
        "fontSize=11;fontStyle=1;fontColor=#000000;labelBackgroundColor=#FFFFFF;"
    )
    if exit_xy:
        style += f"exitX={exit_xy[0]};exitY={exit_xy[1]};exitDx=0;exitDy=0;"
    if entry_xy:
        style += f"entryX={entry_xy[0]};entryY={entry_xy[1]};entryDx=0;entryDy=0;"
    val = f' value="{escape(label)}"' if label else ""
    cells.append(
        f'        <mxCell id="{eid}"{val} style="{style}" edge="1" parent="{parent}" '
        f'source="{src}" target="{tgt}">'
    )
    if points:
        cells.append('          <mxGeometry relative="1" as="geometry">')
        cells.append('            <Array as="points">')
        for px, py in points:
            cells.append(f'              <mxPoint x="{px}" y="{py}" />')
        cells.append("            </Array>")
        cells.append("          </mxGeometry>")
    else:
        cells.append('          <mxGeometry relative="1" as="geometry" />')
    cells.append("        </mxCell>")


IZ = 52

# ACTORS (root)
vtx("user", "Users", "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;",
    15, 220, 50, 80)
vtx("dev", "Dev/Admin", "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;",
    15, 1040, 50, 80)

cloud_s = (
    "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
    "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;html=1;"
    "whiteSpace=wrap;fontSize=14;fontStyle=1;container=1;collapsible=0;"
    "shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud;strokeColor=#232F3E;"
    "fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;"
)
vtx("cloud", "AWS Cloud", cloud_s, 90, 25, 2280, 1140)

region_s = (
    "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
    "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;html=1;"
    "whiteSpace=wrap;fontSize=12;fontStyle=1;container=1;collapsible=0;dashed=1;"
    "shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_region;strokeColor=#00A4A6;"
    "fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#248814;"
)
vtx("region", "Region", region_s, 30, 30, 2220, 1080, "cloud")

# EDGE / FRONTEND
vtx("fe", "Edge/Frontend",
    "swimlane;startSize=26;fillColor=#FAFAFA;strokeColor=#8C4FFF;strokeWidth=2;fontStyle=1;horizontal=0;",
    100, 70, 140, 300, "region")
vtx("waf", "AWS WAF", icon("waf", "#DD344C"), 42, 35, IZ, IZ, "fe")
vtx("cf", "CloudFront", icon("cloudfront", "#8C4FFF"), 42, 105, IZ, IZ, "fe")
vtx("s3", "Amazon S3&#xa;(Static)", icon("s3", "#7AA116", 9), 42, 200, IZ, IZ, "fe")

vtx("cognito", "Amazon&#xa;Cognito", icon("cognito", "#DD344C", 9), 290, 75, IZ, IZ, "region")
vtx("apigw", "API&#xa;Gateway", icon("api_gateway", "#E7157B", 9), 290, 195, IZ, IZ, "region")

# APPLICATION LAYER
vtx("app", "Application Layer",
    "swimlane;startSize=26;fillColor=#FFF8F0;strokeColor=#FF9900;strokeWidth=2;"
    "fontStyle=1;dashed=1;dashPattern=8 4;",
    100, 410, 680, 480, "region")

vtx("lpay", "Payment&#xa;Lambda", icon("lambda", "#ED7100", 9), 45, 40, IZ, IZ, "app")
vtx("lticket", "Ticket&#xa;Lambda", icon("lambda", "#ED7100", 9), 45, 140, IZ, IZ, "app")
vtx("lbook", "Booking&#xa;Lambda", icon("lambda", "#ED7100", 9), 45, 240, IZ, IZ, "app")
vtx("sqs", "Amazon SQS", icon("sqs", "#E7157B", 9), 310, 260, IZ, IZ, "app")
vtx("dlq", "Amazon SQS&#xa;(DLQ)", icon("sqs", "#E7157B", 8), 310, 370, IZ, IZ, "app")
vtx("lworker", "SQS Worker&#xa;Lambda", icon("lambda", "#ED7100", 8), 500, 180, IZ, IZ, "app")
vtx("sns", "Amazon SNS", icon("sns", "#E7157B", 9), 45, 370, IZ, IZ, "app")

# VPC
vpc_s = (
    "sketch=0;outlineConnect=0;fontColor=#232F3E;fontStyle=1;container=1;collapsible=0;"
    "recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;"
    "strokeColor=#8C4FFF;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;"
)
vtx("vpc", "VPC", vpc_s, 820, 70, 1400, 820, "region")

# Redis — trong VPC, NGOÀI AZ (đúng mẫu mentor)
vtx("redis", "ElastiCache&#xa;for Redis", icon("elasticache", "#C925D1", 8), 40, 55, IZ, IZ, "vpc")

aza_s = (
    "sketch=0;outlineConnect=0;container=1;collapsible=0;"
    "shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_availability_zone;"
    "strokeColor=#6C8EBF;fillColor=none;verticalAlign=top;align=left;spacingLeft=22;fontSize=11;"
)
vtx("aza", "Availability Zone A", aza_s, 200, 40, 1170, 350, "vpc")
vtx("azb", "Availability Zone B", aza_s, 200, 420, 1170, 350, "vpc")

sub_s = (
    "sketch=0;outlineConnect=0;container=1;collapsible=0;"
    "shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_private_subnet;"
    "strokeColor=#00A4A6;fillColor=#E6F6F7;verticalAlign=top;align=left;spacingLeft=22;fontSize=10;"
)
vtx("suba", "Private Subnet A", sub_s, 15, 30, 1140, 300, "aza")
vtx("subb", "Private Subnet B", sub_s, 15, 30, 1140, 300, "azb")

vtx("proxy", "RDS Proxy", icon("rds", "#C925D1", 9), 420, 80, IZ, IZ, "suba")
vtx("rdsp", "RDS&#xa;(Primary)", icon("rds", "#C925D1", 9), 420, 200, IZ, IZ, "suba")
vtx("rdss", "RDS&#xa;(Standby)", icon("rds", "#C925D1", 9), 420, 90, IZ, IZ, "subb")

# OBSERVABILITY
vtx("obs", "Observability",
    "swimlane;startSize=26;fillColor=#F5F5F5;strokeColor=#666666;strokeWidth=2;"
    "fontStyle=1;dashed=1;dashPattern=8 4;",
    100, 920, 680, 100, "region")
vtx("sns_alarm", "SNS&#xa;System Alarms", icon("sns", "#E7157B", 8), 30, 35, 48, 48, "obs")
vtx("xray", "AWS X-Ray", icon("x_ray", "#E7157B", 9), 120, 35, 48, 48, "obs")
vtx("cw", "CloudWatch", icon("cloudwatch_2", "#E7157B", 9), 210, 35, 48, 48, "obs")
vtx("obs_txt", "DLQ &gt; 0, Lambda Errors, RDS High CPU",
    "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=10;fontStyle=1;",
    310, 42, 350, 24, "obs")

# EDGES — parent=region (không parent=1)
edge("waf", "cf", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
edge("cf", "s3", "2 Fetch UI", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
edge("proxy", "rdsp", exit_xy=(0.5, 1), entry_xy=(0.5, 0))
edge("rdsp", "rdss", "Replication", dashed=True, exit_xy=(0.5, 1), entry_xy=(0.5, 0))

edge("user", "waf", "1 HTTPS Request", exit_xy=(1, 0.5), entry_xy=(0, 0.5), parent="1")
edge("user", "cognito", "3 Login / Get Token", dashed=True,
     exit_xy=(1, 0.35), entry_xy=(0, 0.5), parent="1")
edge("cognito", "user", dashed=True, exit_xy=(0, 0.5), entry_xy=(1, 0.45), parent="1")
edge("cf", "apigw", "4 Route API Call", exit_xy=(1, 0.5), entry_xy=(0, 0.5))
edge("cognito", "apigw", "4.1 Verify Token", dashed=True, bidir=True,
     exit_xy=(0.5, 1), entry_xy=(0.5, 0))

edge("apigw", "lpay", "5.1 Invoke Payment", exit_xy=(1, 0.3), entry_xy=(0, 0.5))
edge("apigw", "lticket", "5.3 Get Ticket", exit_xy=(1, 0.5), entry_xy=(0, 0.5))
edge("apigw", "lbook", "5.2 Create Booking", exit_xy=(1, 0.7), entry_xy=(0, 0.5))

edge("lpay", "proxy", "5.1 Update Balance", exit_xy=(1, 0.5), entry_xy=(0, 0.3))
edge("lticket", "proxy", "5.3 Get Ticket", exit_xy=(1, 0.5), entry_xy=(0, 0.7))
edge("lticket", "redis", "Read/Update Cache", bidir=True,
     exit_xy=(1, 0.3), entry_xy=(0, 0.5))

edge("lbook", "sqs", "7 Send to Queue", dashed=True,
     exit_xy=(1, 0.5), entry_xy=(0, 0.5))
edge("sqs", "lworker", "8 Poll Queue", dashed=True,
     exit_xy=(1, 0.5), entry_xy=(0, 0.5))
edge("lworker", "redis", "6 Deduct Cache", exit_xy=(1, 0.3), entry_xy=(0, 0.8))
edge("lworker", "proxy", "9 Write DB", exit_xy=(1, 0.5), entry_xy=(0, 0.5))
edge("lworker", "sns", "10 Publish Event", dashed=True,
     exit_xy=(0, 0.5), entry_xy=(1, 0.3))

edge("sns", "user", "11 Send Email", dashed=True, color="#0066CC",
     exit_xy=(0, 0.5), entry_xy=(1, 0.6), parent="1")

edge("sqs", "dlq", "Redrive Policy", dashed=True, color="#CC0000",
     exit_xy=(0.5, 1), entry_xy=(0.5, 0))
edge("dlq", "sqs", "Reprocess", dashed=True, color="#CC0000",
     exit_xy=(0, 0.5), entry_xy=(0, 0.85))
edge("dlq", "sns_alarm", "Trigger Alarm/&#xa;Notify Admin", color="#CC0000",
     exit_xy=(0, 0.5), entry_xy=(0.5, 0))
edge("sns_alarm", "dev", "SMS / Email Alert", dashed=True,
     exit_xy=(0, 0.5), entry_xy=(1, 0.3), parent="1")

body = "\n".join(cells)
xml = f"""<mxfile host="app.diagrams.net" agent="Cursor" version="24.7.17" type="device" modified="2026-07-05T20:40:00.000Z">
  <diagram id="movie-booking-v3" name="Movie Ticket Booking v3">
    <mxGraphModel dx="2400" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{PAGE_W}" pageHeight="{PAGE_H}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""

out = r"d:\TT\movie-booking\docs\movie-booking-aws-v3.drawio"
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(xml)
print(f"OK: {out} ({PAGE_W}x{PAGE_H})")
