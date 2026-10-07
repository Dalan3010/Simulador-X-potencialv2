#include "controls.hpp"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>

namespace app {
namespace {
constexpr float sidebar = 330;
struct Definition { const char* name; double low, high, step; bool integer; };
const Definition definitions[] = {
    {"Charge q (nC)",.1,5,.1,false},
    {"Coulomb k (x10^9 SI)",.5,20,.1,false},
    {"Separation d (m)",.2,6,.1,false},
    {"Azimuth (degrees)",0,360,1,false},
    {"Polar (degrees)",0,180,1,false},
    {"Center x (m)",-10,10,.5,false},
    {"Center y (m)",-10,10,.5,false},
    {"Center z / slice z (m)",-10,10,.5,false},
    {"Grid x minimum (m)",-10,10,.5,false},
    {"Grid x maximum (m)",-10,10,.5,false},
    {"Grid y minimum (m)",-10,10,.5,false},
    {"Grid y maximum (m)",-10,10,.5,false},
    {"Grid samples per side",15,150,1,true},
    {"Field arrows per side",4,30,1,true},
};
double value(const dipole::Parameters& p, int index) {
    switch (index) {
    case 0: return p.q; case 1: return p.k; case 2: return p.d;
    case 3: return p.azimuth; case 4: return p.polar;
    case 5: return p.center.x; case 6: return p.center.y; case 7: return p.center.z;
    case 8: return p.xmin; case 9: return p.xmax; case 10: return p.ymin; case 11: return p.ymax;
    case 12: return p.resolution; default: return p.fieldDensity;
    }
}
void assign(dipole::Parameters& p, int index, double v) {
    switch (index) {
    case 0: p.q=v; break; case 1: p.k=v; break; case 2: p.d=v; break;
    case 3: p.azimuth=v; break; case 4: p.polar=v; break;
    case 5: p.center.x=v; break; case 6: p.center.y=v; break; case 7: p.center.z=v; break;
    case 8: p.xmin=v; break; case 9: p.xmax=v; break; case 10: p.ymin=v; break; case 11: p.ymax=v; break;
    case 12: p.resolution=static_cast<int>(v); break;
    case 13: p.fieldDensity=static_cast<int>(v); break;
    }
}
bool hit(Rectangle r) { return CheckCollisionPointRec(GetMousePosition(),r); }
bool button(Rectangle r,const char* text,bool selected=false) {
    DrawRectangleRec(r,selected ? Color{53,107,155,255} : hit(r) ? Color{65,78,96,255} : Color{40,50,67,255});
    DrawText(text,static_cast<int>(r.x+8),static_cast<int>(r.y+8),16,RAYWHITE);
    return hit(r) && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
}
}
Rectangle Controls::viewport() const {
    return {sidebar+15,100,static_cast<float>(GetScreenWidth())-sidebar-30,static_cast<float>(GetScreenHeight())-180};
}
bool Controls::apply(int index,double v) {
    if (!std::isfinite(v) || (definitions[index].integer && std::floor(v)!=v)) {
        error_ = "Use a finite number; resolutions must be integers."; return false;
    }
    // Prevent out-of-range floating-to-integer conversion before validation.
    if (definitions[index].integer && (v<definitions[index].low || v>definitions[index].high)) {
        error_ = "Resolution / density outside its displayed range."; return false;
    }
    auto candidate = parameters;
    assign(candidate,index,v);
    auto error = dipole::validate(candidate);
    if (!error.empty()) { error_ = error; return false; }
    error_.clear();
    if (value(parameters,index)==v) return false;
    parameters = candidate;
    return true;
}
bool Controls::parameterRow(int index,float y) {
    const auto& definition = definitions[index];
    DrawText(definition.name,15,static_cast<int>(y),16,RAYWHITE);
    Rectangle number{155,y+23,112,26}, minus{272,y+23,22,26}, plus{298,y+23,22,26};
    char formatted[40]; std::snprintf(formatted,sizeof(formatted),"%.6g",value(parameters,index));
    bool changed = false;
    const bool inPanel = GetMouseX()<sidebar && GetMouseY()>=100 && GetMouseY()<GetScreenHeight()-70;
    DrawRectangleRec(number,editing_==index ? Color{64,93,119,255} : Color{31,40,54,255});
    DrawText(editing_==index ? buffer_.c_str() : formatted,static_cast<int>(number.x+5),static_cast<int>(number.y+5),16,RAYWHITE);
    if (inPanel && hit(number) && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        editing_ = index; buffer_ = formatted; selectAll_ = true; error_.clear();
    }
    if (button(minus,"-") && inPanel) { editing_=-1; changed |= apply(index,value(parameters,index)-definition.step); }
    if (button(plus,"+") && inPanel) { editing_=-1; changed |= apply(index,value(parameters,index)+definition.step); }
    Rectangle track{18,y+34,126,7};
    DrawRectangleRec(track,Color{74,86,101,255});
    float normalized = static_cast<float>(std::clamp((value(parameters,index)-definition.low)/(definition.high-definition.low),0.0,1.0));
    DrawCircle(static_cast<int>(track.x+normalized*track.width),static_cast<int>(track.y+3),6,SKYBLUE);
    Rectangle target{track.x-5,track.y-9,track.width+10,25};
    if (inPanel && hit(target) && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) { dragging_=index; editing_=-1; }
    if (dragging_==index && IsMouseButtonDown(MOUSE_BUTTON_LEFT)) {
        const double t = std::clamp((GetMouseX()-track.x)/track.width,0.0f,1.0f);
        double v = definition.low+t*(definition.high-definition.low);
        v = definition.low+std::round((v-definition.low)/definition.step)*definition.step;
        changed |= apply(index,std::clamp(v,definition.low,definition.high));
    }
    return changed;
}
bool Controls::draw() {
    bool changed = false;
    DrawRectangle(0,0,GetScreenWidth(),90,Color{24,32,46,255});
    const char* title = "Electric dipole | native C++17";
    DrawText(title,15,12,22,RAYWHITE);
    // Source selector: two mutually exclusive buttons in the top bar, next to the title.
    const float sourceX = 15.0f + static_cast<float>(MeasureText(title,22)) + 18.0f;
    if (button({sourceX,8,96,32},"Dipole",parameters.chargeCount==2) && parameters.chargeCount!=2) {
        parameters.chargeCount = 2; changed = true;
    }
    if (button({sourceX+104,8,134,32},"Single charge",parameters.chargeCount==1) && parameters.chargeCount!=1) {
        parameters.chargeCount = 1; changed = true;
    }
    const char* tabs[] = {"Potential map","Equipotentials","Vector field","Height surface","E-field lines 3D"};
    for (int i=0;i<5;++i) if (button({15.0f+i*148,47,142,32},tabs[i],view==i)) view=i;
    if (button({static_cast<float>(GetScreenWidth()-140),8,125,32},"Help / physics")) help=!help;
    DrawRectangle(0,90,static_cast<int>(sidebar),GetScreenHeight()-90,Color{24,32,46,255});
    const float areaHeight = static_cast<float>(GetScreenHeight()-170);
    const int rows=view==4 ? 8 : 14, toggles=view==4 ? 4 : 5;
    // Filter at render time; definition indices and their switches are never renumbered.
    const bool hideSeparation = parameters.chargeCount==1;
    auto hidden = [&](int index) { return hideSeparation && (index==2 || index==3 || index==4); };
    if (hidden(editing_)) editing_ = -1;
    if (hidden(dragging_)) dragging_ = -1;
    const int visibleRows = rows-(hideSeparation ? 3 : 0);
    const float contentHeight=static_cast<float>(visibleRows*68+toggles*32+92);
    if (!help && GetMouseX()<sidebar && GetMouseY()>100) scroll_ -= GetMouseWheelMove()*40;
    scroll_ = std::clamp(scroll_,0.0f,std::max(0.0f,contentHeight-areaHeight));
    BeginScissorMode(0,100,static_cast<int>(sidebar),static_cast<int>(areaHeight));
    float y = 106-scroll_;
    for (int index=0,rendered=0;index<rows;++index) {
        if (hidden(index)) continue;
        if (!help) changed |= parameterRow(index,y+rendered*68);
        else DrawText(definitions[index].name,15,static_cast<int>(y+rendered*68),16,GRAY);
        ++rendered;
    }
    y += visibleRows*68;
    bool* planeFlags[] = {&visible.charges,&visible.labels,&visible.contours,&visible.grid,&visible.field};
    bool* streamFlags[] = {&visible.charges,&visible.labels,&visible.animationMarkers,&visible.animationPaused};
    const char* planeLabels[] = {"Show charges","Show charge labels","Show contours","Show grid","Field overlay on map"};
    const char* streamLabels[] = {"Show charges","Show charge labels","Show direction markers","Pause marker animation"};
    bool** flags=view==4 ? streamFlags : planeFlags;
    const char** labels=view==4 ? streamLabels : planeLabels;
    for (int i=0;i<toggles;++i) {
        Rectangle r{15,y+i*32,300,27};
        DrawText(*flags[i] ? "[x]" : "[ ]",15,static_cast<int>(r.y+4),17,SKYBLUE);
        DrawText(labels[i],52,static_cast<int>(r.y+4),17,RAYWHITE);
        if (!help && hit(r) && GetMouseY()>=100 && GetMouseY()<100+areaHeight && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
            *flags[i]=!*flags[i];
        }
    }
    y += toggles*32+8;
    if (view==4) {
        DrawText("Marker speed",15,static_cast<int>(y+2),15,RAYWHITE);
        Rectangle speedTrack{118,y+8,175,7};
        DrawRectangleRec(speedTrack,Color{74,86,101,255});
        DrawCircle(static_cast<int>(speedTrack.x+(visible.animationSpeed-.25f)/1.75f*speedTrack.width),static_cast<int>(speedTrack.y+3),6,SKYBLUE);
        Rectangle speedHit{speedTrack.x-5,speedTrack.y-9,speedTrack.width+10,25};
        if (hit(speedHit) && IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && GetMouseX()<sidebar) dragging_=100;
        if (dragging_==100 && IsMouseButtonDown(MOUSE_BUTTON_LEFT))
            visible.animationSpeed=std::clamp(.25f+(GetMouseX()-speedTrack.x)/speedTrack.width*1.75f,.25f,2.0f);
        char speed[32]; std::snprintf(speed,sizeof(speed),"%.2gx",visible.animationSpeed);
        DrawText(speed,297,static_cast<int>(y+1),14,LIGHTGRAY);
        y+=31;
    }
    if (button({15,y,300,33},"Reset defaults") && !help && GetMouseY()>=100 && GetMouseY()<100+areaHeight) {
        // Keep exploring the current source: the reset restores parameters, not the selector.
        const int source = parameters.chargeCount;
        parameters = dipole::Parameters{}; parameters.chargeCount = source;
        visible = Visibility{}; editing_=-1; dragging_=-1; error_.clear(); changed=true;
    }
    EndScissorMode();
    if (contentHeight>areaHeight) {
        float thumb = areaHeight*areaHeight/contentHeight;
        DrawRectangle(324,100+static_cast<int>(scroll_/(contentHeight-areaHeight)*(areaHeight-thumb)),4,static_cast<int>(thumb),SKYBLUE);
    }
    if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT)) dragging_=-1;
    if (editing_>=0 && !help) {
        if ((IsKeyDown(KEY_LEFT_CONTROL) || IsKeyDown(KEY_RIGHT_CONTROL)) && IsKeyPressed(KEY_A)) selectAll_=true;
        for (int c=GetCharPressed();c>0;c=GetCharPressed()) {
            if ((c>='0' && c<='9') || c=='.' || c=='-' || c=='+' || c=='e' || c=='E') {
                if (selectAll_) { buffer_.clear(); selectAll_=false; }
                if (buffer_.size()<24) buffer_+=static_cast<char>(c);
            }
        }
        if (IsKeyPressed(KEY_BACKSPACE)) {
            if (selectAll_) { buffer_.clear(); selectAll_=false; }
            else if (!buffer_.empty()) buffer_.pop_back();
        }
        if (IsKeyPressed(KEY_ESCAPE)) editing_=-1;
        if (IsKeyPressed(KEY_ENTER)) {
            char* end = nullptr;
            const double v = std::strtod(buffer_.c_str(),&end);
            if (end==buffer_.c_str() || *end!='\0') error_="Invalid number. Enter to apply; Escape to cancel.";
            else {
                changed |= apply(editing_,v);
                if (error_.empty()) editing_=-1;
            }
        }
    }
    DrawText("Scroll sidebar | click value to type",12,GetScreenHeight()-58,15,LIGHTGRAY);
    DrawText("Enter: apply  /  Esc: cancel",12,GetScreenHeight()-37,15,LIGHTGRAY);
    if (!error_.empty()) DrawText(error_.c_str(),345,GetScreenHeight()-28,16,ORANGE);
    if (help) {
        Rectangle r{sidebar+25,115,static_cast<float>(GetScreenWidth())-sidebar-50,480};
        DrawRectangleRec(r,Color{20,29,43,250});
        const bool single = parameters.chargeCount==1;
        const char* lines[] = {
            "Physics and numerical conventions",
            single ? "V = k q (1/r)  [V]" : "V = k q (1/r+ - 1/r-)  [V]",
            "q is in nC; displayed k is in 10^9 SI units.",
            "r = sqrt(dx^2 + dy^2 + dz^2 + epsilon^2)",
            single ? "epsilon = max(0.001 L, 0.000001 m); L = half the smaller domain span"
                   : "epsilon = max(0.001 d, 0.000001 m)",
            "E = -grad V  [V/m]; centered differences, h = 0.05 epsilon.",
            "Map and field slice: physical z = center z.",
            "Contours: CPU marching squares with saddle decider.",
            "Height is visual: clamp(V / color limit, -1, 1) * H.",
            "H = 0.3 * smaller domain span; height is NOT physical z.",
            single ? "View 5: physical 3D lines integrate the single-charge electric field."
                   : "View 5: physical 3D lines integrate the dipole electric field.",
            "Curves are cached after physical parameter changes, never per frame.",
            single ? "Direction markers move outward from the charge along each field line."
                   : "Direction markers move from +q toward -q along each field line.",
            "Radial magnitude and volume APIs remain available in the core.",
            "Marker motion indicates direction, not actual particle velocity.",
            "Pause, hide, or adjust marker speed in the fifth-view controls.",
            "3D: left-drag orbit, wheel zoom, only inside the plot.",
            "Controls: slider, +/- or click number and type; Enter applies.",
            "Invalid values leave the previous simulation intact."
        };
        for (int i=0;i<19;++i) DrawText(lines[i],static_cast<int>(r.x+18),static_cast<int>(r.y+18+i*23),i==0 ? 21 : 14,RAYWHITE);
    }
    return changed;
}
}
