import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import Footer from "../../components/Footer";

const RIndex = () => {
    return(
        <div className="h-screen grid grid-rows-[1fr_auto] overflow-hidden" >
            <div>
                <SidebarWithContentSeparator className="overflow-y-auto h-full"/>
            </div>
            <Footer></Footer>
        </div>
            
    );
}

export default RIndex;