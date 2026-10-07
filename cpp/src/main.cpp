#include "controls.hpp"
#include "renderer.hpp"
#include <cstring>
#include <algorithm>
#include <exception>
#include <iostream>

int main(int argc,char** argv) {
    bool smoke=false;
    for (int i=1;i<argc;++i) {
        if (std::strcmp(argv[i],"--smoke")==0) smoke=true;
        else if (std::strcmp(argv[i],"--help")==0) {
            std::cout << "dipole_simulator [--smoke]\n--smoke opens a window and renders all five views, then exits.\n";
            return 0;
        } else { std::cerr << "Unknown argument: " << argv[i] << '\n'; return 2; }
    }
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1200,700,"Electric dipole - native simulator");
    if (!IsWindowReady()) { std::cerr << "Cannot create a graphics window.\n"; return 1; }
    SetWindowMinSize(1000,640);
    SetExitKey(KEY_NULL); // Escape cancels numerical editing, not the application.
    SetTargetFPS(60);
    int result=0;
    try {
        app::Controls controls;
        if (smoke) {
            controls.parameters.resolution=150;
            controls.parameters.fieldDensity=30;
        }
        app::Renderer renderer; // GPU resources are destroyed before CloseWindow.
        renderer.update(controls.parameters);
        bool dirty=false;
        int frame=0;
        constexpr int framesPerView=8;
        constexpr int smokeStages=5;
        const double smokeStart=GetTime();
        const char* views[]={"potential map","equipotential contours","vector field","height surface","dipole streamlines"};
        while (!WindowShouldClose()) {
            if (smoke) {
                if (GetTime()-smokeStart>25) { std::cerr << "Smoke exceeded bounded runtime.\n"; result=1; break; }
                const int stage=frame/framesPerView;
                controls.view=std::min(stage,4);
                if (frame%framesPerView==0) {
                    std::cout << "SMOKE rendering: " << views[stage] << '\n';
                }
            }
            if (dirty) { renderer.update(controls.parameters); dirty=false; }
            BeginDrawing();
            ClearBackground(Color{232,236,242,255});
            renderer.draw(controls.viewport(),controls.view,controls.visible,controls.blocksCamera());
            dirty=controls.draw();
            EndDrawing();
            ++frame;
            if (smoke && frame==smokeStages*framesPerView) break;
        }
        if (smoke) {
            if (frame==smokeStages*framesPerView) std::cout << "SMOKE PASS: all five views rendered, including cached dipole streamlines and animated direction markers, 40 frames.\n";
            else { std::cerr << "Smoke interrupted before all views rendered.\n"; result=1; }
        }
    } catch (const std::exception& e) {
        std::cerr << "Simulation error: " << e.what() << '\n'; result=1;
    }
    CloseWindow();
    return result;
}
